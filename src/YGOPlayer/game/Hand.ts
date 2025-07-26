import * as THREE from "three";
import { Card } from "ygo-core";
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { GameCardHand } from "./GameCardHand";
import { CARD_HEIGHT_SIZE } from "../constants";

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

    this.duel.core.events.on("resize", () => {
      this.render();
    });
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

  private getCardHandPivot() {
    const cardHeight = CARD_HEIGHT_SIZE;
    const camera = this.duel.camera;
    const distance = camera.position.z;
    const baseHandZ = 6;
    const fov = ((camera as any).fov * Math.PI) / 180;
    const visibleHeightAtZ = 2 * Math.tan(fov / 2) * Math.abs(distance - baseHandZ);
    const screenEdgeOffset = 0.15;
    const minVisibleHeight = cardHeight * 0.1;

    let handY = 0;

    if (this.player === 0) {
      handY = -visibleHeightAtZ / 2 + screenEdgeOffset;

      if (handY < -visibleHeightAtZ / 2 + minVisibleHeight) {
        handY = -visibleHeightAtZ / 2 + minVisibleHeight;
      }

      if (handY < -12.5) {
        handY = -12.5;
      }
    } else {
      handY = visibleHeightAtZ / 2 - screenEdgeOffset;

      if (handY > visibleHeightAtZ / 2 - minVisibleHeight) {
        handY = visibleHeightAtZ / 2 - minVisibleHeight;
      }

      if (handY > 12.5) {
        handY = 12.5;
      }
    }

    return handY;
  }

  render() {
    const gameField = this.duel.fields[this.player];
    const totalCards = gameField.hand.cards.length;
    const cardsTransforms = this.getCardsTransforms(totalCards);
    const cardRotation = this.getCardsRotation();

    for (let i = 0; i < totalCards; ++i) {
      const index = this.player === 0 ? i : totalCards - 1 - i;
      const handCard = gameField.hand.getCard(index)!;
      handCard.position = cardsTransforms[index].position;
      handCard.gameObject.position.copy(handCard.position);
      handCard.gameObject.scale.copy(cardsTransforms[i].scale);
      handCard.gameObject.rotation.setFromVector3(cardRotation);
      handCard.gameObject.visible = true;
    }
  }

  public getCardsTransforms(handSize: number): { position: THREE.Vector3, scale: THREE.Vector3 }[] {
    const cardPositions: { position: THREE.Vector3, scale: THREE.Vector3 }[] = new Array(handSize);
    const cardWidth = 10;
    const cardSpacing = 2.7;
    const baseHandZ = 6;
    const handDistribution = 22;
    const handY = this.getCardHandPivot();
    const totalCards = handSize;
    const normalHandWidth = (totalCards - 1) * cardSpacing + cardWidth;
    const needsCompression = normalHandWidth > handDistribution;

    let actualSpacing = cardSpacing;
    let actualWidth = normalHandWidth;

    if (needsCompression) {
      actualSpacing = (handDistribution - cardWidth) / (totalCards - 1);
      actualWidth = handDistribution;
    }

    for (let i = 0; i < totalCards; ++i) {
      const index = this.player === 0 ? i : totalCards - 1 - i;
      const xOffset = -actualWidth / 2 + cardWidth / 2 + i * actualSpacing;
      const handZ = baseHandZ;
      const position = new THREE.Vector3(xOffset, handY, handZ);
      const scale = new THREE.Vector3(1, 1, 1);

      if (needsCompression) {
        const scaleMultiplier = 1 - 0.02 * Math.abs(i - totalCards / 2) / (totalCards / 2);
        scale.set(scaleMultiplier, scaleMultiplier, 1);
      } else {
        scale.set(1, 1, 1);
      }

      cardPositions[index] = {
        position: position,
        scale: scale,
      }
    }

    return cardPositions;
  }

  public getCardsRotation() {
    const rotation = this.player === 0 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, this.showHand ? 0 : THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(180));
    return rotation;
  }

  public destroyAllCards() {
    this.cards.forEach(card => card.destroy());
    this.cards.length = 0;
  }
}
