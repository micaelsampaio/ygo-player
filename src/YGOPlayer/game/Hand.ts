import { Card } from "ygo-core";
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { GameCardHand } from "./GameCardHand";
import * as THREE from "three";

export class GameHand extends YGOEntity {
  private duel: YGODuel;
  public canHoverHand: boolean = true;
  public canClickHand: boolean = true;
  public cards: GameCardHand[];
  public selectedCard: GameCardHand | undefined;
  private player: number;
  public showHand: boolean;

  constructor(duel: YGODuel, player: number, showHand: boolean) {
    super();
    this.duel = duel;
    this.player = player;
    this.cards = [];
    this.selectedCard = undefined;
    this.showHand = showHand;
  }

  public disableHand() { }

  public enableHand() { }

  public onCardHover() { }

  getCard(index: number): GameCardHand {
    return this.cards[index];
  }

  getCardFromReference(card: Card): GameCardHand {
    return this.cards.find((c) => c.card === card)!;
  }

  getCardFromCardId(id: number): GameCardHand {
    return this.cards.find((c) => c.card.id === id)!;
  }

  removeCardFromCardReference(card: Card) {
    const index = this.cards.findIndex((c) => c.card === card);

    if (index >= 0) {
      this.cards[index].destroy();
      this.cards = this.cards.filter((_, i) => i !== index);
      this.cards.forEach((c, index) => (c.handIndex = index));
    }
  }

  render() {
    const gameField = this.duel.fields[this.player];
    const camera = this.duel.camera;
    const cardWidth = 10;
    const cardSpacing = 2.7;
    const totalCards = gameField.hand.cards.length;
    const fov = ((camera as any).fov * Math.PI) / 180;
    const distance = camera.position.z;
    const handDistribution = 22;
    const baseHandZ = 6;
    const visibleHeightAtZ = 2 * Math.tan(fov / 2) * Math.abs(distance - baseHandZ);
    const screenEdgeOffset = 0.15;
    const handY = this.player === 0 ? -visibleHeightAtZ / 2 + screenEdgeOffset : visibleHeightAtZ / 2 - screenEdgeOffset;
    const normalHandWidth = (totalCards - 1) * cardSpacing + cardWidth;
    const needsCompression = normalHandWidth > handDistribution;
    const showHand = this.player === 0;
    let actualSpacing = cardSpacing;
    let actualWidth = normalHandWidth;

    if (needsCompression) {
      actualSpacing = (handDistribution - cardWidth) / (totalCards - 1);
      actualWidth = handDistribution;
    }

    for (let i = 0; i < totalCards; ++i) {
      const index = this.player === 0 ? i : totalCards - 1 - i;
      const handCard = gameField.hand.getCard(index)!;
      const xOffset = -actualWidth / 2 + cardWidth / 2 + i * actualSpacing;
      const handZ = baseHandZ;
      handCard.gameObject.position.set(xOffset, handY, handZ);

      if (needsCompression) {
        const scaleMultiplier = 1 - 0.02 * Math.abs(i - totalCards / 2) / (totalCards / 2);
        handCard.gameObject.scale.set(scaleMultiplier, scaleMultiplier, 1);
      } else {
        handCard.gameObject.scale.set(1, 1, 1);
      }

      handCard.position = handCard.gameObject.position.clone();

      if (handCard.card.originalOwner === 0) {
        handCard.gameObject.rotation.set(0, 0, 0);
      } else {
        handCard.gameObject.rotation.set(0, this.showHand ? 0 : THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(180));
      }

      handCard.gameObject.visible = true;
    }
  }
}
