import { YGOClientType, YGOCommands, YGOGameUtils, YGOPlayerState } from "ygo-core";
import { assistPhaseRouteFor } from "../../domain/assist-routing";
import { FieldZone } from "ygo-core";
import { YGODuelPhase } from "ygo-core";
import { CardActions } from "./card-actions";

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
    const walk = async (): Promise<{ notices?: string[] }> => {
      let current: any = controller.options;
      for (const [i, phase] of steps.entries()) {
        let route = assistPhaseRouteFor(current, phase);
        if (route.kind === "continueFirst" && i === 0) {
          await controller.choose({ commandType: "Pass", data: {} });
          current = await query();
          route = assistPhaseRouteFor(current, phase);
        }
        if (route.kind === "blocked") return { notices: [route.message] };
        if (route.kind !== "choose") return i === 0 ? { notices: [`Can't go to ${phase} right now.`] } : {};
        await controller.choose({ commandType: "Duel Phase", data: { phase } });
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
}
