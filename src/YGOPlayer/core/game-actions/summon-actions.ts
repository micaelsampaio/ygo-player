import { YGOCommands, YGOGameUtils } from "ygo-core";
import { Card, CardPosition, FieldZone } from "ygo-core";
import { CardZone } from "../../game/CardZone";
import { getCardZones, getGameZone, getMonstersZones } from "../../scripts/ygo-utils";
import { CardZoneKV } from "../../types";
import { GameActionsBase } from "./base";

/** Normal, Set, Special, Tribute, Extra Deck (Link / Xyz / Synchro / Fusion) Summons and tokens. */
export class SummonActions extends GameActionsBase {
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
}
