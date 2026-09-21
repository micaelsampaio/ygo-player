import { YGOCore, YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import { BotYGOPlayerClient } from "./bot-client";
import { BotLegalityTracker } from "./legality";
import { BotPolicy, BotPolicyFactory } from "./bot-policy";
import { getPolicyFactory } from "./policy-registry";

/**
 * The bot's decision loop. It never mutates YGOCore/YGOGameState directly —
 * it only ever reads it (via attachGame, after LocalYGOPlayerServer
 * constructs the shared, authoritative core) to decide what to do, and
 * acts exclusively by emitting the same wire-format commands a human's UI
 * would through its BotYGOPlayerClient. It wakes up on every
 * "command-executed" event (the same feed everyone else's state updates
 * come from), so it can't miss a turn/phase change or act on stale state.
 *
 * The actual decision-making is delegated to a BotPolicy, resolved by
 * name via policy-registry.ts (defaults to "rule-based" — today's only
 * implementation). This class doesn't know or care which policy it's
 * driving; swapping in a different one (e.g. an ML-backed policy later)
 * never requires touching this file.
 */
export class BotController {
  private client: BotYGOPlayerClient;
  private playerIndex: number;
  private actionDelayMs: number;
  private createPolicy: BotPolicyFactory;
  private ygo?: YGOCore;
  private legality?: BotLegalityTracker;
  private policy?: BotPolicy;
  private acting = false;

  constructor(
    username: string,
    playerIndex: number,
    options?: { actionDelayMs?: number; model?: string },
  ) {
    this.playerIndex = playerIndex;
    this.actionDelayMs = options?.actionDelayMs ?? 600;
    this.createPolicy = getPolicyFactory(options?.model);
    this.client = new BotYGOPlayerClient(username);
  }

  getClient(): BotYGOPlayerClient {
    return this.client;
  }

  /**
   * Must be called after this controller's client has been registered
   * with YGOGameServer (constructor binds it synchronously) and before
   * sendReady() — gives the bot its read-only view of the shared game and
   * starts its reactive loop.
   */
  attachGame(ygo: YGOCore) {
    this.ygo = ygo;
    this.legality = new BotLegalityTracker(ygo, this.playerIndex);
    this.policy = this.createPolicy({ ygo, playerIndex: this.playerIndex, legality: this.legality });
    ygo.events.on("command-executed", () => this.maybeAct());
  }

  /** Must be called only after attachGame(). */
  sendReady() {
    this.client.emit("client:ready");
  }

  private maybeAct() {
    if (!this.ygo || this.acting) return;
    if (this.ygo.state.turnPlayer !== this.playerIndex) return;

    this.acting = true;
    setTimeout(() => {
      this.acting = false;
      this.takeTurnStep();
    }, this.actionDelayMs);
  }

  private takeTurnStep() {
    if (!this.ygo || !this.legality || !this.policy) return;
    if (this.ygo.state.turnPlayer !== this.playerIndex) return; // stale timer guard

    this.legality.sync();

    const commands = this.policy.decideNextAction();
    if (commands && commands.length > 0) {
      for (const command of commands) {
        this.sendCommand(command.type, command.data);
      }
      return;
    }

    this.advancePhaseOrEndTurn();
  }

  /** Nothing left to do this phase — advance, mirroring the human UI's own phase-advance rules. */
  private advancePhaseOrEndTurn() {
    const phase = this.ygo!.state.phase;
    const turn = this.ygo!.state.turn;

    const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(phase);
    let nextIndex = currentIndex + 1;

    // Turn 1 skips Battle/Main2, same rule the human UI's nextPhase() applies.
    if (turn === 1 && phase === YGODuelPhase.Main1) {
      nextIndex += 2;
    }

    const nextPhase = YGO_DUEL_PHASE_ORDER[nextIndex];

    if (nextPhase) {
      this.sendCommand("DuelPhaseCommand", { phase: nextPhase });
      return;
    }

    // Past End phase: end the turn.
    this.sendCommand("DuelTurnCommand", {});
    this.sendCommand("DuelPhaseCommand", { phase: YGODuelPhase.Draw });
  }

  private sendCommand(type: string, data: any) {
    this.client.emit("server:exec", {
      type: "ygo:commands:exec",
      data: { command: { type, data } },
    });
  }
}
