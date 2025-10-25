export class YGOStatic {
  static playerIndex: number = 0;
  static otherPlayerIndex: number = 1;
  static playerPOV: number = 0;
  static isPlayer = (playerIndex: number) => YGOStatic.playerIndex === playerIndex;
  static isOtherPlayer = (playerIndex: number) => YGOStatic.otherPlayerIndex === playerIndex;
  static isPlayerPOV = (playerIndex: number) => YGOStatic.playerPOV === playerIndex;
  static getPlayerCssIndex = (playerIndex: number) => YGOStatic.isPlayerPOV(playerIndex) ? 0 : 1;
}