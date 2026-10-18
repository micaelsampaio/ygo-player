import * as THREE from "three";
import { YGOEntity } from "../core/YGOEntity";
import type { YGODuel } from "../core/YGODuel";
import { Card, FieldZoneData } from "ygo-core";
import { YGOGameUtils } from "ygo-core";
import { GameCardStats } from "./GameCardStats";
import { CardMaterial, CardTransparentOverlay } from "./materials/game-card-material";
import {
  buildCardFaceMaterials,
  disposeCardMaterials,
  getCardColorMaterial,
  getCardGeometry,
  getCardPlaneGeometry,
} from "./materials/card-mesh-resources";

export class GameCard extends YGOEntity {
  private duel: YGODuel;
  private player: number | undefined;
  public cardReference!: Card;

  private transparentCard: THREE.Mesh | undefined;
  private cardStats: GameCardStats | undefined;
  private hasStats: boolean;
  private zoneData: FieldZoneData | undefined;
  /** Materials created by this card (front/back faces); the shared edge material is not included. */
  private ownedMaterials: THREE.Material[] = [];

  constructor({
    duel,
    card,
    player,
    stats = true,
  }: {
    duel: YGODuel
    card?: Card
    player?: number
    stats?: boolean
  }) {
    super();

    this.duel = duel;
    this.player = player;
    this.hasStats = stats;

    // Placeholder faces until setCard runs; geometry and placeholders are shared by all cards.
    const materials = buildCardFaceMaterials(getCardColorMaterial(0xff00ff), getCardColorMaterial(0xff0000));

    this.gameObject = new THREE.Mesh(getCardGeometry(), materials);

    this.duel.core.scene.add(this.gameObject);

    if (card) this.setCard(card);
  }

  setCard(card: Card) {
    this.cardReference = card;

    const frontTexture = this.duel.assets.getTexture(card.images.small_url);
    const backTexture = this.duel.assets.getTexture(this.duel.fields[card.originalOwner || this.player || 0].settings.backCardPath);
    const frontMaterial = new CardMaterial({ map: frontTexture }); // Front with texture
    const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture }); // Back

    // The textures belong to the asset cache; only the materials wrapping them are ours.
    disposeCardMaterials(this.ownedMaterials);
    this.ownedMaterials = [frontMaterial, backMaterial];

    const mesh = this.gameObject as THREE.Mesh;
    mesh.material = buildCardFaceMaterials(frontMaterial, backMaterial);

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
    const backTexture = this.duel.assets.getTexture(this.duel.fields[card.originalOwner].settings.backCardPath);

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

    this.transparentCard = new THREE.Mesh(getCardPlaneGeometry(), transparentMaterial);
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
    if (this.transparentCard) {
      this.duel.core.scene.remove(this.transparentCard);
      disposeCardMaterials(this.transparentCard.material);
      this.transparentCard = undefined;
    }
    disposeCardMaterials(this.ownedMaterials);
    this.ownedMaterials = [];
    this.duel.destroy(this);
  }
}
