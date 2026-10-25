import { YGOClientType, YGOCommands, YGOGameUtils, YGOPlayerState, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { assistPhaseRouteFor, openPhaseWindow } from "../../domain/assist-routing";
import type { AssistQueryResult } from "../../domain/assist-query";
import { FieldZone } from "ygo-core";
import { YGODuelPhase } from "ygo-core";
import { CardActions } from "./card-actions";
import { chainModeOn } from "../../domain/chain-mode";

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
}
