import { YGOCore, YGOGameLegality, FieldZone } from "ygo-core";

/**
 * ygo-core tracks no per-turn state for anyone (no "already normal
 * summoned"/"already attacked" flags exist on YGOGameState). Since the bot
 * reads the authoritative YGOCore directly (read-only — it never mutates
 * it, only ever acts through emitted commands), it's also the one place
 * that must keep these turn-scoped counters, resetting them whenever it
 * observes the turn number change.
 */
export class BotLegalityTracker {
  private lastSeenTurn = -1;
  private normalSummonsUsedThisTurn = 0;
  private attackedZones = new Set<FieldZone>();

  constructor(
    private ygo: YGOCore,
    private playerIndex: number,
  ) {}

  /** Call at the start of every decision — resets counters on a new turn. */
  sync() {
    if (this.ygo.state.turn !== this.lastSeenTurn) {
      this.lastSeenTurn = this.ygo.state.turn;
      this.normalSummonsUsedThisTurn = 0;
      this.attackedZones.clear();
    }
  }

  isMyTurn(): boolean {
    return this.ygo.state.turnPlayer === this.playerIndex;
  }

  canNormalSummon(): boolean {
    return YGOGameLegality.canNormalSummon(this.normalSummonsUsedThisTurn);
  }

  recordNormalSummon() {
    this.normalSummonsUsedThisTurn++;
  }

  getOpenMonsterZones(): FieldZone[] {
    return YGOGameLegality.getOpenMonsterZones(this.ygo.state, this.playerIndex);
  }

  canDeclareAttack(zone: FieldZone): boolean {
    return YGOGameLegality.canDeclareAttack(this.ygo.state, zone, this.attackedZones);
  }

  recordAttack(zone: FieldZone) {
    this.attackedZones.add(zone);
  }

  getAttackableTargets(): FieldZone[] {
    const opponentIndex = this.playerIndex === 0 ? 1 : 0;
    return YGOGameLegality.getAttackableTargets(this.ygo.state, opponentIndex);
  }

  /** getAttackableTargets is really "occupied monster zones for a player" — reused for our own side. */
  getOwnMonsterZones(): FieldZone[] {
    return YGOGameLegality.getAttackableTargets(this.ygo.state, this.playerIndex);
  }
}
