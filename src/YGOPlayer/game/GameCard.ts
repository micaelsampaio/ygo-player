import * as THREE from "three";
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from "../core/YGODuel";
import { Card, FieldZoneData } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { GameCardStats } from "./GameCardStats";
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from "../constants";
import { CardMaterial, CardTransparentOverlay } from "./materials/game-card-material";

export class GameCard extends YGOEntity {
  private duel: YGODuel;
  public cardReference!: Card;

  private transparentCard: THREE.Mesh | undefined;
  private cardStats: GameCardStats | undefined;
  private hasStats: boolean;
  private zoneData: FieldZoneData | undefined;

  constructor({
    duel,
    card,
    stats = true,
  }: {
    duel: YGODuel;
    card?: Card;
    stats?: boolean;
  }) {
    super();

    this.duel = duel;
    this.hasStats = stats;

    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO, depth = CARD_DEPTH;
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const frontMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Depth
    const backMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Depth
    const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

    const materials = [
      depthMaterial, // Right (depth)
      depthMaterial, // Left (depth)
      depthMaterial, // Top (depth)
      depthMaterial, // Bottom (depth)
      frontMaterial, // Front
      backMaterial, // Back
    ];

    this.gameObject = new THREE.Mesh(geometry, materials);

    this.duel.core.scene.add(this.gameObject);

    if (card) this.setCard(card);
  }

  setCard(card: Card) {
    this.cardReference = card;

    const frontTexture = this.duel.assets.getTexture(card.images.small_url);
    const backTexture = this.duel.assets.getTexture(`${this.duel.config.cdnUrl}/images/card_back.png`);
    const frontMaterial = new CardMaterial({ map: frontTexture }); // Front with texture
    const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture }); // Back
    const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

    const materials = [
      depthMaterial, // Right (depth)
      depthMaterial, // Left (depth)
      depthMaterial, // Top (depth)
      depthMaterial, // Bottom (depth)
      frontMaterial, // Front
      backMaterial, // Back
    ];

    const mesh = this.gameObject as THREE.Mesh;
    mesh.material = materials;

    this.gameObject.name = "FIELD_CARD" + card.name;
  }

  public updateCardStats(zoneData: FieldZoneData) {

    this.zoneData = zoneData;

    this.updateTransparentCard();

    if (!this.hasStats) return;

    if (YGOGameUtils.isSpellTrap(this.cardReference) && (zoneData.zone === "S" || zoneData.zone === "F")) {
      if (this.cardStats) this.cardStats.hide();
      return;
    }

    if (!this.cardStats) {
      this.cardStats = new GameCardStats({
        card: this.cardReference,
        duel: this.duel,
        parent: this.gameObject,
      });
      this.cardStats.card = this.cardReference;
      this.cardStats.duel = this.duel;
      this.cardStats.parent = this.gameObject;
    }

    if (zoneData.zone === "S" || zoneData.zone === "F") {
      this.cardStats.hide();
      return;
    }

    if (YGOGameUtils.isFaceDown(this.cardReference)) {
      this.cardStats.hide();
    } else {
      this.cardStats.show();
    }

    this.cardStats.render();
  }

  private updateTransparentCard() {

    if (!this.duel.settings.getShowFaceDownCardsTransparent()) return;


    if (this.transparentCard) {
      return this.showTransparentCard();
    };

    if (!this.cardReference || !YGOGameUtils.isFaceDown(this.cardReference)) {
      return;
    }

    const card = this.cardReference;
    const frontTexture = this.duel.assets.getTexture(card.images.small_url);
    const backTexture = this.duel.assets.getTexture(`${this.duel.config.cdnUrl}/images/card_back.png`);

    const transparentMaterial = new CardTransparentOverlay({
      map: frontTexture,
      backTexture: backTexture,
      opacity: 0.8,
      transparent: true,
      animationDuration: 2.5,
      minOpacity: 0.65,
      maxOpacity: 1
    });

    this.gameObject.visible = false;

    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO;
    const planeGeometry = new THREE.PlaneGeometry(width, height);

    this.transparentCard = new THREE.Mesh(planeGeometry, transparentMaterial);
    this.duel.core.scene.add(this.transparentCard);

    this.showTransparentCard();
  }

  public updateTransparentCardsState(status: boolean) {
    if (!status) {
      this.hideTransparentCard();
    } else {
      this.updateTransparentCard();
    }
  }

  private showTransparentCard() {
    if (!this.duel.settings.getShowFaceDownCardsTransparent()) {
      this.hideTransparentCard();
      return;
    };

    if (this.transparentCard) {
      if (this.cardReference && YGOGameUtils.isFaceDown(this.cardReference) && this.canViewCard()) {
        this.transparentCard.visible = true;
        this.gameObject.visible = false;

        this.transparentCard.scale.copy(this.gameObject.scale);
        this.transparentCard.position.copy(this.gameObject.position);
        this.transparentCard.rotation.copy(this.gameObject.rotation);
        this.transparentCard.rotateY(THREE.MathUtils.degToRad(180));
      } else {
        this.transparentCard.visible = false;
        this.gameObject.visible = true;
      }
    };
  }
  private hideTransparentCard() {
    if (this.transparentCard) {
      this.transparentCard.visible = false;
      this.gameObject.visible = true;
    };
  }

  public hideCardStats() {
    if (this.cardStats) this.cardStats.hide();
    this.hideTransparentCard();
  }

  public showCardStats() {
    if (this.cardStats) this.cardStats.show();
    this.showTransparentCard();
  }

  private destroyCardStats() {
    if (this.cardStats) {
      this.cardStats.destroy();
    }
  }

  private canViewCard() {
    if (!this.cardReference) return true;
    if (!YGOGameUtils.isFaceDown(this.cardReference)) return true;
    return this.zoneData && this.duel.fields[this.zoneData.player].settings.showCards;
  }

  destroy() {
    this.destroyCardStats();
    if (this.transparentCard) this.duel.core.scene.remove(this.transparentCard);
    this.duel.destroy(this);
  }
}
