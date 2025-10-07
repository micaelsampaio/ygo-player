export class YGOStatic {
  static playerIndex: number = 0;
  static otherPlayerIndex: number = 1;

  static isPlayer = (playerIndex: number) => YGOStatic.playerIndex === playerIndex;
  static isOtherPlayer = (playerIndex: number) => YGOStatic.otherPlayerIndex === playerIndex;
}