import { getActivePerspective } from "./YGOPerspective";

/**
 * @deprecated Use the duel's own perspective (`duel.perspective`, or
 * `useDuelPerspective()` in the UI). This shim reads and writes the
 * perspective of the duel created last, so with two duels on one page it
 * only sees one of them.
 */
export class YGOStatic {
  static get playerIndex(): number { return getActivePerspective().playerIndex; }
  static set playerIndex(value: number) { getActivePerspective().playerIndex = value; }
  static get otherPlayerIndex(): number { return getActivePerspective().otherPlayerIndex; }
  static set otherPlayerIndex(value: number) { getActivePerspective().otherPlayerIndex = value; }
  static get playerPOV(): number { return getActivePerspective().playerPOV; }
  static set playerPOV(value: number) { getActivePerspective().playerPOV = value; }
  static isPlayer = (playerIndex: number) => getActivePerspective().isPlayer(playerIndex);
  static isOtherPlayer = (playerIndex: number) => getActivePerspective().isOtherPlayer(playerIndex);
  static isPlayerPOV = (playerIndex: number) => getActivePerspective().isPlayerPOV(playerIndex);
  static getPlayerCssIndex = (playerIndex: number) => getActivePerspective().getPlayerCssIndex(playerIndex);
}
