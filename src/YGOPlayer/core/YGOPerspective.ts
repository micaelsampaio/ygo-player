/**
 * Who this duel is played/viewed by: the local player's index, the other
 * player's index and the player whose side is drawn at the bottom of the
 * board (the POV). One per YGODuel (`duel.perspective`), set when the duel
 * is created from the server's game state, so two duels on one page do not
 * share it.
 */
export class YGOPerspective {
  playerIndex = 0;
  otherPlayerIndex = 1;
  playerPOV = 0;

  set({ playerIndex, otherPlayerIndex, playerPOV }: { playerIndex: number; otherPlayerIndex: number; playerPOV: number }) {
    this.playerIndex = playerIndex;
    this.otherPlayerIndex = otherPlayerIndex;
    this.playerPOV = playerPOV;
  }

  /** `player` is the local player (the one this client plays). */
  isPlayer = (player: number) => this.playerIndex === player;
  isOtherPlayer = (player: number) => this.otherPlayerIndex === player;
  /** `player`'s side is drawn at the bottom of the board. */
  isPlayerPOV = (player: number) => this.playerPOV === player;
  /**
   * The side shown as "this client's": the local player's, or — for a
   * spectator, whose playerIndex is -1 — the side drawn at the bottom.
   * Always a real player index (0 or 1), unlike playerIndex.
   */
  get localSide(): number {
    return this.playerIndex >= 0 ? this.playerIndex : this.playerPOV >= 0 ? this.playerPOV : 0;
  }
  /** The side opposite localSide. */
  get otherSide(): number {
    return this.playerIndex >= 0 ? this.otherPlayerIndex : 1 - this.localSide;
  }
  /** 0 for the bottom (POV) side, 1 for the top side — the `ygo-player-N` CSS class. */
  getPlayerCssIndex = (player: number) => (this.isPlayerPOV(player) ? 0 : 1);
}

/** The perspective the duel created last uses — only for the deprecated YGOStatic shim. */
let active = new YGOPerspective();

export function setActivePerspective(perspective: YGOPerspective) {
  active = perspective;
}

export function getActivePerspective(): YGOPerspective {
  return active;
}
