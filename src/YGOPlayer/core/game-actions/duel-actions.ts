import { YGOClientType, YGOCommands, YGOGameUtils, YGOPlayerState, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { assistPhaseRouteFor, openPhaseWindow } from "../../domain/assist-routing";
import type { AssistQueryResult } from "../../domain/assist-query";
import { FieldZone } from "ygo-core";
import { YGODuelPhase } from "ygo-core";
import { CardActions } from "./card-actions";
import { chainModeOn } from "../../domain/chain-mode";
import { isEngineDuel } from "../../domain/engine-reachable";
import { ATTACK_NOT_NOW_NOTICE, checkAssistedAttack, engineAttacker, type AssistedAttackCheck } from "../../domain/assisted-attacks";

/** Deck and hand, player (life points, state, notes, dice, coin, surrender), phases and turns, battle. */
export class DuelActions extends CardActions {
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

  public swapPlayerHand({
    player,
  }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.SwapHandCommand({ player }));
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

  public diceRoll({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.DiceRollCommand({
      player,
      rolls: 1
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

  public admitDefeat({ player }: {
    player: number
  }) {
    this.duel.execCommand(new YGOCommands.AdmitDefeatCommand({
      player
    }))
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
    const controller = duel.assistController;
    const first = assistPhaseRouteFor(controller.options, steps[0]);
    if (first.kind === "freeForm") return null;
    this.clearAction();
    if (first.kind === "blocked") {
      duel.events.dispatch("assist-notice", { message: first.message });
      return Promise.resolve();
    }

    const query = () => controller.query();
    // The board may already be at a step: the server shows the phase of the window it offers
    // (a Standby Phase window turns the board's Draw Phase into Standby).
    const reached = (phase: YGODuelPhase) =>
      YGO_DUEL_PHASE_ORDER.indexOf(duel.ygo.state.phase) >= YGO_DUEL_PHASE_ORDER.indexOf(phase);
    const walk = async (): Promise<{ notices?: string[] }> => {
      let current: AssistQueryResult | null = controller.options;
      for (const [i, phase] of steps.entries()) {
        // Each open window on the way (a phase moment, nothing to respond to) is passed: the player
        // asked to move on. The first step passes any window the route allows.
        for (let n = 0; n < 5 && !reached(phase); n++) {
          const route = assistPhaseRouteFor(current, phase);
          if (route.kind !== "continueFirst" || (i > 0 && !openPhaseWindow(current))) break;
          await controller.choose({ commandType: "Pass", data: {} });
          current = await query();
        }
        if (reached(phase)) continue;
        const route = assistPhaseRouteFor(current, phase);
        if (route.kind === "blocked") return { notices: [route.message] };
        // A window something happened in (a summon to respond to, a forced chain): stop there.
        if (route.kind === "continueFirst") return {};
        if (route.kind !== "choose") return i === 0 ? { notices: [`Can't go to ${phase} right now.`] } : {};
        await controller.choose({ commandType: "Duel Phase", data: { phase } });
        current = await query();
        // An effect's choice the engine left open for the player: stop here.
        if (current?.available && current.pending === "prompt") return {};
      }
      return {};
    };

    duel.events.dispatch("assist-choice-start", {});
    return walk()
      .then((res) => duel.events.dispatch("assist-choice-done", { notices: res?.notices }))
      .catch((error: unknown) => duel.events.dispatch("assist-choice-done", { error }));
  }

  /**
   * Assisted Mode, End Turn while already in the End Phase: the engine may still hold the player's
   * own End Phase window there (a Quick-Play they could chain). Ending the turn passes it through
   * the engine, which hands the turn over server-side — a free-form Duel Turn would flip the board
   * to the opponent's turn while the engine is still in this one (room d2b13f17: the bot's turn
   * then paused on "End Phase: activate a card?"). Returns null when the engine isn't holding a
   * window for the player: the caller ends the turn free-form.
   */
  public endTurnAssisted(): Promise<void> | null {
    const duel = this.duel;
    if (!duel.assist || duel.client?.type !== YGOClientType.PLAYER || !duel.ygo?.options?.assistedMode) return null;
    const controller = duel.assistController;
    const first = assistPhaseRouteFor(controller.options, YGODuelPhase.End);
    if (first.kind !== "continueFirst" && first.kind !== "blocked") return null;
    this.clearAction();
    if (first.kind === "blocked") {
      duel.events.dispatch("assist-notice", { message: first.message });
      return Promise.resolve();
    }
    const turnPlayer = duel.ygo.state.turnPlayer;
    const walk = async () => {
      let current: AssistQueryResult | null = controller.options;
      // Each of the player's End Phase windows, until the engine hands the turn over.
      for (let i = 0; i < 5 && assistPhaseRouteFor(current, YGODuelPhase.End).kind === "continueFirst"; i++) {
        await controller.choose({ commandType: "Pass", data: {} });
        if (duel.ygo.state.turnPlayer !== turnPlayer || duel.ygo.state.phase !== YGODuelPhase.End) break;
        current = await controller.query();
      }
    };
    duel.events.dispatch("assist-choice-start", {});
    return walk()
      .then(() => duel.events.dispatch("assist-choice-done", {}))
      .catch((error: unknown) => duel.events.dispatch("assist-choice-done", { error }));
  }

  /** Change phase. Chain mode: an open chain resolves first, so it never carries into the next phase. */
  public setDuelPhase({ phase }: { phase: YGODuelPhase }) {
    this.resolveOpenChain();
    this.duel.execCommand(new YGOCommands.DuelPhaseCommand({
      phase
    }));
  }

  /** Next turn. Chain mode: an open chain resolves first. */
  public nextDuelturn() {
    this.resolveOpenChain();
    this.duel.execCommand(new YGOCommands.DuelTurnCommand());
  }

  private resolveOpenChain() {
    if (chainModeOn(this.duel)) this.resolveChain();
  }

  /**
   * Assisted Mode: the engine lists this monster as an attacker now, so the attack goes through it
   * (the battle's damage, destruction and the triggers it sets off are the engine's) instead of the
   * manual one, whose results are only what the player enters.
   */
  public canAttackThroughEngine(attackingZone: FieldZone): boolean {
    const duel = this.duel;
    if (!duel.assist || duel.client?.type !== YGOClientType.PLAYER || !duel.ygo?.options?.assistedMode) return false;
    const card = duel.ygo.state.getCardFromZone(attackingZone);
    return !!card && !!engineAttacker(duel.assistController.options, card.id, attackingZone);
  }

  /**
   * Assisted Mode with Manual attacks off: every attack is the engine's — only its legal attackers
   * and targets are offered, and nothing else is sent (domain/assisted-attacks.ts). The board's
   * free-form attack needs the explicit switch (duel.setManualAttacks).
   */
  public attacksThroughEngineOnly(): boolean {
    return isEngineDuel(this.duel) && !this.duel.manualAttacks;
  }

  /** The zones of the opponent's monsters `player` could aim at (Main and Extra Monster Zones). */
  public opponentMonsterZones(player: number): string[] {
    const field = this.duel.fields?.[1 - player];
    if (!field) return [];
    return [
      ...field.monsterZone.filter((zone) => zone.hasCard()),
      ...field.extraMonsterZone.filter((zone) => zone.hasCard() && zone.zoneData.player !== player),
    ].map((zone) => zone.zone);
  }

  /** How the engine takes this attack (`attackedZone` none: a direct attack). */
  public checkEngineAttack(attackingZone: FieldZone, attackedZone?: FieldZone): AssistedAttackCheck {
    const card = this.duel.ygo.state.getCardFromZone(attackingZone);
    const player = YGOGameUtils.getZoneData(attackingZone).player;
    const targets = this.opponentMonsterZones(player);
    if (!card) return { kind: "refused", message: ATTACK_NOT_NOW_NOTICE };
    return checkAssistedAttack(
      this.duel.assistController.options,
      { code: card.id, zone: attackingZone },
      attackedZone ? { zone: attackedZone, opponentMonster: targets.includes(attackedZone) } : null,
      targets.length > 0,
    );
  }

  /** Whether the engine lets the monster in `attackingZone` attack directly now (Assisted Mode). */
  public canAttackDirectlyThroughEngine(attackingZone: FieldZone): boolean {
    return this.checkEngineAttack(attackingZone).kind === "engine";
  }

  /**
   * The attack through the engine (Assisted Mode), aimed at `attackedZone` (none: a direct
   * attack): "engine" when it went there; "refused" when Assisted Mode refuses it (a notice
   * says why, nothing is sent); "free" when the caller makes the free-form attack (a manual
   * duel, or Manual attacks on and the engine can't take this one).
   */
  private routeAssistedAttack(attackingZone: FieldZone, attackedZone?: FieldZone): "engine" | "refused" | "free" {
    if (!isEngineDuel(this.duel)) return "free";
    const check = this.checkEngineAttack(attackingZone, attackedZone);
    if (check.kind === "refused") {
      if (!this.attacksThroughEngineOnly()) return "free";
      this.clearAction();
      this.duel.events.dispatch("assist-notice", { message: check.message });
      return "refused";
    }
    const card = this.duel.ygo.state.getCardFromZone(attackingZone)!;
    const routed = this.routeAssisted("Attack", card, attackingZone, (ref) => ({
      // No target: a direct attack, which the server also holds to the engine's direct flag.
      attackingId: ref.code, ctrl: ref.ctrl, loc: ref.loc, seq: ref.seq, ...(attackedZone ? { attackedZone } : { direct: true }),
    }));
    if (routed) return "engine";
    return this.attacksThroughEngineOnly() ? "refused" : "free";
  }

  public attack({ attackingId, attackingZone, attackedId, attackedZone, destroyAttacking, destroyAttacked, battleDamage }: {
    attackingId: number, attackingZone: FieldZone, attackedId: number, attackedZone: FieldZone,
    destroyAttacking?: boolean, destroyAttacked?: boolean, battleDamage?: number
  }) {
    if (this.routeAssistedAttack(attackingZone, attackedZone) !== "free") return;

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
    if (this.routeAssistedAttack(originZone) !== "free") return;

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
}
