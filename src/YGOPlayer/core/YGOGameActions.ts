import { YGOClientType, YGOCommands, YGOGameUtils, YGOPlayerState } from "ygo-core";
import { ASSIST_FREE_FORM_NOTICE, AssistMove, assistPhaseRouteFor, assistRouteFor } from "../ui/assist-routing";
import type { CardRefData } from "../ui/assist-prompt";
import { Card, CardPosition, FieldZone } from "ygo-core";
import { ActionCardSelection } from "../actions/ActionSelectCard";
import { CardZone } from "../game/CardZone";
import {
  getCardZones,
  getGameZone,
  getMonstersZones,
  getXyzMonstersZones,
} from "../scripts/ygo-utils";
import { CardZoneKV } from "../types";
import { YGODuel } from "./YGODuel";
import { YGODuelPhase } from "ygo-core";
import { YGOStatic } from "./YGOStatic";

export class YGOGameActions {
  private duel: YGODuel;
  private cardSelection: ActionCardSelection;

  constructor(duel: YGODuel) {
    this.duel = duel;
    this.cardSelection =
      this.duel.gameController.getComponent<ActionCardSelection>(
        "action_card_selection"
      );
  }

  //////////// UTILS
  private clearAction() {
    this.duel.events.dispatch("clear-ui-action");
  }

  public setSelectedCard({ card, force = false, player }: { card: Card | null, force?: boolean, player?: number }) {
    if (!force) {
      const position = card?.position ?? null;
      const owner = card?.originalOwner ?? -1;
      const showCards = Number.isInteger(player) ? this.duel.fields[player!].settings.showCards : true;

      if (!showCards && owner >= 0) {

        if (!YGOStatic.isPlayerPOV(owner) && position && position.includes("facedown")) {
          return;
        }
      }
    }

    this.duel.events.dispatch("set-selected-card", { card, player });
  }

  /**
   * Assisted Mode: when the engine currently offers this exact move for this
   * card, make it through the engine (duel.assist.choose) — the engine runs
   * the effect and the panel then shows its prompts for the human to answer.
   * Returns true when it did. Otherwise (no match) the caller falls back to
   * the free-form move, with a short notice that the engine can't follow it.
   */
  private routeAssisted(move: AssistMove, card: Card, originZone: FieldZone | undefined): boolean {
    const duel = this.duel;
    const assist = duel.assist;
    if (!assist || duel.client?.type !== YGOClientType.PLAYER || !duel.ygo?.options?.assistedMode) return false;
    const route = assistRouteFor(duel.assistOptions, move, card.id, originZone);
    if (route.kind === "freeForm") {
      duel.events.dispatch("assist-notice", { message: ASSIST_FREE_FORM_NOTICE });
      return false;
    }
    this.clearAction();
    if (route.kind === "blocked") {
      duel.events.dispatch("assist-notice", { message: route.message });
      return true;
    }
    const choose = (ref: CardRefData) => assist.choose({ commandType: move, data: { id: ref.code, ctrl: ref.ctrl, loc: ref.loc, seq: ref.seq } });
    duel.events.dispatch("assist-choice-start", { code: card.id });
    const done = route.kind === "choose"
      ? choose(route.ref)
      // Continue past the open window, then make the move if the engine now lists it.
      : assist.choose({ commandType: "Pass", data: {} })
        .then(() => assist.query())
        .then((next: any) => {
          duel.assistOptions = next;
          const again = assistRouteFor(next, move, card.id, originZone);
          if (again.kind === "choose") return choose(again.ref);
          return { notices: [`${card.name ?? "That card"} can't do that right now.`] };
        });
    done
      .then((res: any) => duel.events.dispatch("assist-choice-done", { notices: res?.notices }))
      .catch((error: any) => duel.events.dispatch("assist-choice-done", { error }));
    return true;
  }

  /**
   * Assisted Mode: a Link / Xyz / Synchro / Fusion Summon from the Extra Deck
   * goes through the engine as that card's Special Summon — it picks the
   * legal materials and offers only the zones the monster may go to (an
   * Extra Monster Zone, or a Main Monster Zone a Link Arrow points to). The
   * free-form path below offers every zone, and while the engine waits on
   * something else (a chain window) it is rejected outright.
   */
  private routeExtraDeckSummon(card: Card): boolean {
    const index = this.extraDeckIndex(card);
    if (index === -1) return false;
    return this.routeAssisted("Special Summon", card, YGOGameUtils.createZone("ED", card.originalOwner, index + 1));
  }

  private extraDeckIndex(card: Card): number {
    return this.duel.ygo.state.fields[card.originalOwner].extraDeck.findIndex((c: any) => c === card);
  }

  /** The Extra Deck zone `card` is summoned from (ED-n, 1-based). */
  private edOriginZone(card: Card): FieldZone {
    return YGOGameUtils.createZone("ED", card.originalOwner, this.extraDeckIndex(card) + 1);
  }

  /**
   * Second step of every material summon: offer the owner's free zones of
   * `zoneTypes` plus the zones the materials free up, then exec the command
   * built for the picked zone and clear the UI action.
   */
  private pickSummonZone({
    card,
    zoneTypes,
    freedZones,
    showConfirm,
    build,
  }: {
    card: Card;
    zoneTypes: ("M" | "EMZ")[];
    freedZones: CardZone[];
    showConfirm?: boolean;
    build: (zone: FieldZone) => any;
  }) {
    const zonesToSummon = getCardZones(this.duel, [card.originalOwner], zoneTypes);
    freedZones.forEach((z) => zonesToSummon.push(z));

    this.cardSelection.startSelection({
      zones: zonesToSummon,
      selectionType: "zone",
      ...(showConfirm === undefined ? {} : { showConfirm }),
      onSelectionCompleted: (cardZone: CardZone) => {
        this.duel.execCommand(build(cardZone.zone));
        this.clearAction();
      },
    });
  }

  /**
   * Link / Xyz / Xyz overlay / Synchro Summon from the Extra Deck: pick
   * materials among the owner's monsters that pass `materialFilter`, then a
   * Main or Extra Monster Zone (the freed material zones included).
   */
  private materialSummon({
    card,
    materialFilter,
    buildCommand,
  }: {
    card: Card;
    materialFilter?: (material: Card) => boolean;
    buildCommand: (data: {
      player: number;
      id: number;
      materials: { id: number; zone: FieldZone }[];
      originZone: FieldZone;
      zone: FieldZone;
    }) => any;
  }) {
    if (this.routeExtraDeckSummon(card)) return;
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();
    const originZone = this.edOriginZone(card);
    const monsters = getMonstersZones(this.duel, [card.originalOwner]);
    const zones = materialFilter ? monsters.filter((zone) => materialFilter(zone.getCardReference()!)) : monsters;

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const materials = cardZones.map((cardZone) => ({
          id: cardZone.getCardReference()!.id,
          zone: cardZone.zone,
        }));

        this.pickSummonZone({
          card,
          zoneTypes: ["M", "EMZ"],
          freedZones: cardZones,
          showConfirm: false,
          build: (zone) => buildCommand({ player, id: card.id, materials, originZone, zone }),
        });
      },
    });
  }

  /**
   * Clear the pending UI action, have the player pick one of `getZones()`,
   * then exec the command `build` makes for that zone.
   */
  private selectZoneThen(
    getZones: () => CardZone[],
    build: (zone: FieldZone, player: number) => any,
    { skipIfNoZones = false }: { skipIfNoZones?: boolean } = {}
  ) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();
    const zones = getZones();
    if (skipIfNoZones && zones.length === 0) return;

    this.cardSelection.startSelection({
      zones,
      selectionType: "zone",
      onSelectionCompleted: (cardZone: CardZone) => {
        this.duel.execCommand(build(cardZone.zone, player));
      },
    });
  }

  /**
   * One-shot command on `card` ({ player, id, ...extra }). `clear` says
   * whether the pending UI action is cleared first: banish, flip,
   * changeBattlePosition, toDeck and disapear leave it as is.
   */
  private execOnCard(
    CommandClass: new (data: any) => any,
    { card, player, ...extra }: { card: Card; player?: number; [key: string]: any },
    { clear = true }: { clear?: boolean } = {}
  ) {
    if (clear) this.clearAction();
    this.duel.execCommand(
      new CommandClass({
        player: player ?? this.duel.serverActions.getActivePlayer(),
        id: card.id,
        ...extra,
      })
    );
  }

  //////////////////////// COMMANDS

  public normalSummon({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    if (this.routeAssisted("Normal Summon", card, originZone)) return;
    this.selectZoneThen(
      () => getCardZones(this.duel, [card.originalOwner], ["M"]),
      (zone, player) => new YGOCommands.NormalSummonCommand({ player, id: card.id, originZone, zone })
    );
  }

  public setSummon({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    if (this.routeAssisted("Set Monster", card, originZone)) return;
    this.selectZoneThen(
      () => getCardZones(this.duel, [card.originalOwner], ["M"]),
      (zone, player) => new YGOCommands.SetMonsterCommand({ player, id: card.id, originZone, zone })
    );
  }

  public specialSummon({
    card,
    originZone,
    position = "faceup-attack",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: CardPosition;
  }) {
    if (this.routeAssisted("Special Summon", card, originZone)) return;
    this.selectZoneThen(
      () => {
        // Allow selecting Extra Monster Zones only when origin is actually Extra Deck
        const zoneTypes: ("M" | "S" | "F" | "EMZ")[] = ["M"];
        const zoneData = originZone ? YGOGameUtils.getZoneData(originZone as any) : null;
        if (zoneData && zoneData.zone === "ED") {
          zoneTypes.push("EMZ");
        }
        return getCardZones(this.duel, [card.originalOwner], zoneTypes);
      },
      (zone, player) => new YGOCommands.SpecialSummonCommand({ player, id: card.id, originZone, zone, position })
    );
  }

  public tributeSummon({
    card,
    position = "faceup-attack",
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
    position?: CardPosition;
  }) {
    if (this.routeAssisted(position === "facedown" ? "Set Monster" : "Normal Summon", card, originZone)) return;
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();

    const zones = getMonstersZones(this.duel, [card.originalOwner]);

    this.cardSelection.startMultipleSelection({
      zones,
      selectionType: "card",
      onSelectionCompleted: (cardZones: CardZone[]) => {
        const tributes = cardZones.map((cardZone) => ({
          id: cardZone.getCardReference()!.id,
          zone: cardZone.zone,
        }));

        this.pickSummonZone({
          card,
          zoneTypes: ["M"],
          freedZones: cardZones,
          build: (zone) =>
            new YGOCommands.TributeSummonCommand({ player, id: card.id, tributes, originZone, zone, position }),
        });
      },
    });
  }

  public linkSummon({ card }: { card: Card }) {
    this.materialSummon({
      card,
      materialFilter: (m) => YGOGameUtils.isFaceUp(m),
      buildCommand: (data) => new YGOCommands.LinkSummonCommand(data),
    });
  }

  public xyzSummon({ card, position = "faceup-attack" }: { card: Card; position?: CardPosition }) {
    this.materialSummon({
      card,
      materialFilter: (m) => !YGOGameUtils.isToken(m) && YGOGameUtils.isFaceUp(m),
      buildCommand: (data) => new YGOCommands.XYZSummonCommand({ ...data, position }),
    });
  }

  public xyzOverlaySummon({ card, position = "faceup-attack" }: { card: Card; position?: CardPosition }) {
    this.materialSummon({
      card,
      materialFilter: (m) => !YGOGameUtils.isToken(m) && YGOGameUtils.isFaceUp(m),
      buildCommand: (data) => new YGOCommands.XYZOverlaySummonCommand({ ...data, position }),
    });
  }

  public synchroSummon({ card, position = "faceup-attack" }: { card: Card; position?: CardPosition }) {
    this.materialSummon({
      card,
      buildCommand: (data) => new YGOCommands.SynchroSummonCommand({ ...data, position }),
    });
  }

  public fusionSummon({
    card,
    position = "faceup-attack",
  }: {
    card: Card;
    position?: CardPosition;
  }) {
    if (this.routeExtraDeckSummon(card)) return;
    const player = this.duel.serverActions.getActivePlayer();

    this.duel.events.dispatch("toggle-ui-menu", {
      group: "game-popup",
      type: "select-card-menu",
      data: {
        player,
        filter: {
          monsters: true,
          field: true,
          hand: true,
          mainDeck: true,
        },
        onSelectCards: (cards: CardZoneKV[]) => {
          this.duel.events.dispatch("close-ui-menu", {
            type: "select-card-menu",
          });

          const originZone = this.edOriginZone(card);
          const materials = cards.map((cardData) => {
            return { id: cardData.card.id, zone: cardData.zone };
          });

          // Materials on the field (Main or Extra Monster Zone) free their zone.
          const freedZones: CardZone[] = [];
          materials.forEach((material) => {
            const zoneData = YGOGameUtils.getZoneData(material.zone);
            if (zoneData.zone === "M" || zoneData.zone === "EMZ") {
              freedZones.push(getGameZone(this.duel, zoneData)!);
            }
          });

          this.pickSummonZone({
            card,
            zoneTypes: ["M", "EMZ"],
            freedZones,
            showConfirm: false,
            build: (zone) =>
              new YGOCommands.FusionSummonCommand({ player, id: card.id, materials, originZone, zone, position }),
          });
        },
      },
    });
  }

  public createToken({ position }: { position?: CardPosition } = {}) {
    this.selectZoneThen(
      () => getCardZones(this.duel, [0, 1], ["M"]),
      (zone, player) => new YGOCommands.CreateTokenCommand({ player, originZone: zone, position })
    );
  }

  public disapear({
    card,
    originZone,
  }: {
    card: Card,
    originZone: FieldZone;
  }) {
    if (!YGOGameUtils.isToken(card)) return;
    this.execOnCard(YGOCommands.DisappearCommand, { card, originZone }, { clear: false });
  }

  public setCard({
    card,
    originZone,
    zone,
    reveal = false,
    selectZone = true,
  }: {
    card: Card;
    originZone: FieldZone;
    zone?: FieldZone;
    reveal?: boolean;
    selectZone?: boolean;
  }) {
    if (selectZone && this.routeAssisted("Set ST", card, originZone)) return;

    if (selectZone) {
      this.selectZoneThen(
        () => getCardZones(this.duel, [card.originalOwner], ["S"]),
        (zone, player) => new YGOCommands.SetCardCommand({ player, id: card.id, originZone, zone, reveal })
      );
    } else {
      this.execOnCard(YGOCommands.SetCardCommand, { card, originZone, zone, reveal });
    }
  }

  public activateCard({
    card,
    originZone,
    selectZone = false,
  }: {
    card: Card;
    originZone: FieldZone;
    selectZone?: boolean;
  }) {
    if (this.routeAssisted("Activate", card, originZone)) return;

    if (selectZone) {
      this.selectZoneThen(
        () => getCardZones(this.duel, [card.originalOwner], ["S"]),
        (zone, player) => new YGOCommands.ActivateCardCommand({ player, id: card.id, originZone, zone })
      );
    } else {
      this.execOnCard(YGOCommands.ActivateCardCommand, { card, zone: originZone });
    }
  }

  public sendToGy({ card, player, originZone }: { card: Card; player?: number; originZone: FieldZone }) {
    this.execOnCard(YGOCommands.SendCardToGYCommand, { card, player, originZone });
  }

  public revealCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.RevealCommand, { card, originZone });
  }

  public banish({
    card,
    originZone,
    position = "faceup",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: "faceup" | "facedown";
  }) {
    this.execOnCard(YGOCommands.BanishCommand, { card, originZone, position }, { clear: false });
  }

  public banishMultiple({
    cards,
    position = "faceup",
  }: {
    cards: { card: Card, zone: FieldZone }[];
    position?: "faceup" | "facedown";
  }) {
    this.duel.execCommand(
      new YGOCommands.BanishCommand({
        player: this.duel.serverActions.getActivePlayer(),
        ids: cards.map(data => ({ id: data.card.id, zone: data.zone })),
        position,
      })
    );
  }

  public toST({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.selectZoneThen(
      () => getCardZones(this.duel, [card.originalOwner], ["S"]),
      (zone, player) => new YGOCommands.ToSTCommand({ player, id: card.id, originZone, zone })
    );
  }

  public fieldSpell({
    card,
    originZone,
    position = "faceup",
  }: {
    card: Card;
    originZone: FieldZone;
    position?: "faceup" | "facedown";
  }) {
    if (this.routeAssisted(position === "facedown" ? "Set ST" : "Activate", card, originZone)) return;
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();
    const cardZone = this.duel.fields[card.originalOwner].fieldZone;

    this.duel.execCommand(
      new YGOCommands.FieldSpellCommand({
        player,
        id: card.id,
        originZone,
        zone: cardZone.zone as "F" | "F2",
        position,
      })
    );
  }

  public toHand({ card, reveal, originZone }: { card: Card; reveal?: boolean, originZone: FieldZone }) {
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();

    if (card.isMainDeckCard) {
      this.duel.execCommand(
        new YGOCommands.ToHandCommand({
          player,
          id: card.id,
          originZone,
          reveal
        })
      );
    } else {
      this.toExtraDeck({ card, originZone });
    }
  }

  public toExtraDeck({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();

    if (card.isMainDeckCard && !YGOGameUtils.isPendulumCard(card)) {
      this.toHand({ card, originZone });
    } else {
      const zoneData = YGOGameUtils.getZoneData(originZone);
      this.duel.execCommand(
        new YGOCommands.ToExtraDeckCommand({
          player,
          id: card.id,
          originZone: YGOGameUtils.createZone(
            zoneData.zone,
            card.owner,
            zoneData.zoneIndex
          ),
        })
      );
    }
  }

  public moveCard({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.selectZoneThen(
      () => {
        const zonesToMove: any = ["M", "S"];
        if (YGOGameUtils.isFieldSpell(card)) zonesToMove.push("F");
        return getCardZones(this.duel, [0, 1], zonesToMove).filter((c) => c.zone !== originZone);
      },
      (zone, player) => new YGOCommands.MoveCardCommand({ player, id: card.id, originZone, zone })
    );
  }

  public toDeck({
    card,
    originZone,
    shuffle = false,
    position = "top",
  }: {
    card: Card;
    originZone: FieldZone;
    position: "top" | "bottom" | undefined;
    shuffle?: boolean;
  }) {

    if (!card.isMainDeckCard) return this.toExtraDeck({ card, originZone })

    this.execOnCard(YGOCommands.ToDeckCommand, { card, originZone, position, shuffle }, { clear: false });
  }

  public flip({ card, originZone }: { card: Card; originZone: FieldZone }) {
    this.execOnCard(YGOCommands.FlipCommand, { card, originZone }, { clear: false });
  }

  public changeBattlePosition({
    card,
    originZone,
    position,
  }: {
    card: Card;
    originZone: FieldZone;
    position: CardPosition;
  }) {
    this.execOnCard(YGOCommands.ChangeCardPositionCommand, { card, originZone, position }, { clear: false });
  }

  public drawFromDeck({ player }: { player: number }) {
    this.duel.execCommand(new YGOCommands.DrawFromDeckCommand({ player }));
  }

  public milFromDeck({
    player,
    numberOfCards = 1,
  }: {
    player: number;
    numberOfCards?: number;
  }) {
    this.duel.execCommand(
      new YGOCommands.MillFromDeckCommand({ player, numberOfCards })
    );
  }

  public attachMaterial({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.selectZoneThen(
      () => getXyzMonstersZones(this.duel, [0, 1]).filter(c => c.getCardReference() !== card),
      (zone, player) => new YGOCommands.XYZAttachMaterialCommand({ player, id: card.id, originZone, zone }),
      { skipIfNoZones: true }
    );
  }

  public detachMaterial({
    card,
    originZone,
    materialIndex,
  }: {
    card: Card;
    originZone: FieldZone;
    materialIndex: number;
  }) {
    this.clearAction();
    const player = this.duel.serverActions.getActivePlayer();
    const material = card.materials[materialIndex];
    this.duel.execCommand(
      new YGOCommands.XYZDetachMaterialCommand({
        player,
        id: material.id,
        originZone,
        materialIndex,
      })
    );
  }

  public destroyCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.DestroyCardCommand, { card, originZone });
  }

  public destroyAllCards({
    zone,
  }: {
    zone: "monster" | "spell" | "all";
  }) {
    this.clearAction();

    const player = this.duel.serverActions.getActivePlayer();

    this.duel.execCommand(
      new YGOCommands.DestroyAllCardsOnFieldCommand({
        player,
        zone
      })
    );
  }

  public targetCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.TargetCommand, { card, originZone });
  }

  public negateCard({
    card,
    originZone,
  }: {
    card: Card;
    originZone: FieldZone;
  }) {
    this.execOnCard(YGOCommands.NegateCommand, { card, originZone });
  }

  public lifePointsTransaction({
    player,
    value
  }: {
    player: number,
    value: string,
  }) {
    this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({ player, value }));
  }

  public swapPlayerHand({
    player,
  }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.SwapHandCommand({ player }));
  }

  public addDuelNote({
    player,
    note,
    duration
  }: {
    player?: number
    note: string,
    duration?: number
  }) {
    const parsedDuration = duration && !isNaN(duration) && duration > 0 ? duration : -1;

    this.duel.execCommand(new YGOCommands.NoteCommand({
      player: player ?? this.duel.serverActions.getActivePlayer(),
      note,
      duration: parsedDuration
    }));
  }

  /**
   * Assisted Mode: the phase menu's phase changes go through the engine
   * (duel.assist.choose "Duel Phase", the same move as the panel's Next
   * Phase row), one phase at a time, so the engine opens each new phase's
   * chain window — and a chain stop of "Always" pauses there. The walk stops
   * at the first window or prompt left open for the player. Returns null
   * when the engine doesn't take the first step (not Assisted Mode, or a
   * phase it doesn't offer): the caller makes the free-form change.
   */
  public goToPhaseAssisted(steps: YGODuelPhase[]): Promise<void> | null {
    const duel = this.duel;
    const assist = duel.assist;
    if (!assist || steps.length === 0 || duel.client?.type !== YGOClientType.PLAYER || !duel.ygo?.options?.assistedMode) return null;
    const first = assistPhaseRouteFor(duel.assistOptions, steps[0]);
    if (first.kind === "freeForm") return null;
    this.clearAction();
    if (first.kind === "blocked") {
      duel.events.dispatch("assist-notice", { message: first.message });
      return Promise.resolve();
    }

    const query = async () => {
      const next = await assist.query();
      duel.assistOptions = next;
      return next;
    };
    const walk = async (): Promise<{ notices?: string[] }> => {
      let current = duel.assistOptions;
      for (const [i, phase] of steps.entries()) {
        let route = assistPhaseRouteFor(current, phase);
        if (route.kind === "continueFirst" && i === 0) {
          await assist.choose({ commandType: "Pass", data: {} });
          current = await query();
          route = assistPhaseRouteFor(current, phase);
        }
        if (route.kind === "blocked") return { notices: [route.message] };
        if (route.kind !== "choose") return i === 0 ? { notices: [`Can't go to ${phase} right now.`] } : {};
        await assist.choose({ commandType: "Duel Phase", data: { phase } });
        current = await query();
        // A window (or an effect's choice) the engine left open for the player: stop here.
        if (current?.available && (current.pending === "chain" || current.pending === "prompt")) return {};
      }
      return {};
    };

    duel.events.dispatch("assist-choice-start", {});
    return walk()
      .then((res) => duel.events.dispatch("assist-choice-done", { notices: res?.notices }))
      .catch((error: any) => duel.events.dispatch("assist-choice-done", { error }));
  }

  public setDuelPhase({ phase }: { phase: YGODuelPhase }) {
    this.duel.execCommand(new YGOCommands.DuelPhaseCommand({
      phase
    }));
  }

  public nextDuelturn() {
    this.duel.execCommand(new YGOCommands.DuelTurnCommand());
  }

  public attack({ attackingId, attackingZone, attackedId, attackedZone, destroyAttacking, destroyAttacked, battleDamage }: {
    attackingId: number, attackingZone: FieldZone, attackedId: number, attackedZone: FieldZone,
    destroyAttacking?: boolean, destroyAttacked?: boolean, battleDamage?: number
  }) {

    const attackingZoneData = YGOGameUtils.getZoneData(attackingZone);
    const attackedZoneData = YGOGameUtils.getZoneData(attackedZone);

    this.duel.execCommand(new YGOCommands.AttackCommand({
      player: attackingZoneData.player,
      attackedId,
      attackedZone,
      attackingId,
      attackingZone
    }))

    if (battleDamage && battleDamage > 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: attackedZoneData.player,
        value: "-" + battleDamage.toString()
      }))
    }

    if (battleDamage && battleDamage < 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: attackingZoneData.player,
        value: battleDamage.toString()
      }))
    }

    if (destroyAttacking) {
      this.duel.execCommand(new YGOCommands.DestroyCardCommand({
        player: attackingZoneData.player,
        id: attackingId,
        originZone: attackingZone
      }))
    }

    if (destroyAttacked) {
      this.duel.execCommand(new YGOCommands.DestroyCardCommand({
        player: attackedZoneData.player,
        id: attackedId,
        originZone: attackedZone
      }))
    }
  }

  public attackDirectly({ id, originZone }: {
    id: number, originZone: FieldZone
  }) {

    const attackZoneData = YGOGameUtils.getZoneData(originZone);
    const card = this.duel.ygo.state.getCardFromZone(originZone)!;
    this.duel.execCommand(new YGOCommands.AttackDirectlyCommand({
      player: attackZoneData.player,
      id,
      originZone
    }))

    if (card.currentAtk > 0) {
      this.duel.execCommand(new YGOCommands.LifePointsTransactionCommand({
        player: 1 - attackZoneData.player,
        value: `-${card.currentAtk}`
      }))
    }
  }

  public shuffleDeck({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.ShuffleDeckCommand({
      player
    }))
  }

  public shuffleHand({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.ShuffleHandCommand({
      player
    }))
  }

  public showHand({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.ShowHandCommand({
      player
    }))
  }

  public showExtraDeck({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.ShowExtraDeckCommand({
      player
    }))
  }

  public setPlayerState({ player, currentState, state }: {
    player: number,
    currentState?: YGOPlayerState
    state: YGOPlayerState
  }) {
    currentState = currentState || this.duel.ygo.getField(player).state;

    this.duel.execCommand(new YGOCommands.PlayerStateCommand({
      player,
      prevState: currentState,
      state
    }))
  }

  public diceRoll({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.DiceRollCommand({
      player,
      rolls: 1
    }))
  }

  public admitDefeat({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.AdmitDefeatCommand({
      player
    }))
  }

  public flipCoin({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.CoinFlipCommand({
      player,
      coinFlips: 1
    }))
  }
}
