import * as THREE from "three";
import { YGOEntity } from "../core/YGOEntity";
import type { YGODuel } from "../core/YGODuel";
import { Card } from "ygo-core";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { ActionCardHandMenu } from "../actions/ActionCardHandMenu";
import { CardMaterial } from "./materials/game-card-material";
import { cancelCardPreview, previewCardOnHover } from "./hover-preview";
import {
  buildCardFaceMaterials,
  disposeCardMaterials,
  getCardColorMaterial,
  getCardGeometry,
} from "./materials/card-mesh-resources";

export class GameCardHand extends YGOEntity implements YGOUiElement {
  private duel: YGODuel;
  public card!: Card;
  public handIndex: number;
  public position: THREE.Vector3;
  public isActive: boolean;
  public isUiElement: boolean = true;
  public isUiElementClick: boolean = true;
  public isUiElementHover: boolean = true;
  public isUiCardElement: boolean = true;
  public player: number;
  public isVisible: boolean;
  private startMouseClickTime: number;

  private visibleFrontMaterial: THREE.Material | undefined;
  private hiddenFrontMaterial: THREE.Material | undefined;
  /** Materials created by this card (front/back faces); shared edge/placeholder materials are not included. */
  private ownedMaterials: THREE.Material[] = [];

  constructor({ duel, player }: { duel: YGODuel; player: number }) {
    super();

    this.duel = duel;

    // Placeholder faces until setCard runs; geometry and placeholders are shared by all cards.
    const materials = buildCardFaceMaterials(getCardColorMaterial(0x0000ff), getCardColorMaterial(0xff0000));
    this.handIndex = 0;
    this.gameObject = new THREE.Mesh(getCardGeometry(), materials);
    this.position = this.gameObject.position;
    this.duel.core.scene.add(this.gameObject);
    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    this.isActive = false;
    this.player = player;
    this.isVisible = true;
    this.startMouseClickTime = -1;
    this.gameObject.userData.isUiCardElement = true;
  }

  onMouseClick?(event: MouseEvent): void {
    if (!this.isUiElementClick) return;

    if (!this.isVisible) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.startMouseClickTime + 1000 < Date.now()) {
      this.setActive(false);
      return;
    };

    if (this.duel.assistController.handPick?.(this.player, this.card.id)) return;

    const action = this.duel.actionManager.getAction<ActionCardHandMenu>("card-hand-menu");

    if (this.duel.actionManager.action === action && action.data.card === this.card) {
      this.duel.actionManager.clearAction();
      return;
    }
    
    this.duel.gameActions.setSelectedCard({
      player: this.player,
      card: this.card
    })

    if (this.duel.config.autoChangePlayer) {
      this.duel.setActivePlayer(this.player);
    }

    action.setData({
      duel: this.duel,
      card: this.card,
      cardInHand: this,
      index: this.handIndex,
      player: this.player,
      mouseEvent: event,
    });
    this.duel.actionManager.setAction(action);
  }

  onMouseEnter?(event: MouseEvent): void {
    if (!this.isVisible) return;
    if (!this.isUiElementHover) return;
    if (!this.card) return;
    this.gameObject.position.copy(this.position);
    this.gameObject.position.y += this.duel.perspective.isPlayerPOV(this.card.owner) ? 0.3 : -0.3;
    // An opponent's hand only shows when their cards are visible to you.
    if (this.duel.perspective.isPlayerPOV(this.card.owner) || this.duel.fields[this.player].settings.showCards) {
      previewCardOnHover(this.duel, this.player, this.card);
    }
  }

  onMouseLeave?(event: MouseEvent): void {
    cancelCardPreview();
    if (!this.isVisible) return;
    if (this.isActive) return;
    if (!this.isUiElementHover) return;
    this.gameObject.position.copy(this.position);
  }

  onMouseDown?(event: MouseEvent): void {
    if (!this.isVisible) return;
    this.startMouseClickTime = Date.now();
    this.duel.events.dispatch("on-card-mouse-down", { card: this.card, event });
  }

  onMouseUp?(event: MouseEvent): void {
    if (!this.isVisible) return;
    this.duel.events.dispatch("on-card-mouse-up", { card: this.card, event });
  }

  setCard(card: Card) {
    if (this.card && card && this.card.id === card.id) {
      this.card = card;
      return;
    }

    const prevCard = this.card;
    this.card = card;

    if (prevCard && prevCard.id === this.card.id) return;

    this.gameObject.name = `HAND_CARD_${this.card.name}`;

    const frontTexture = this.duel.assets.getTexture(this.card.images.small_url);
    const backTexture = this.duel.assets.getTexture(this.duel.fields[card?.originalOwner || this.player || 0].settings.backCardPath);
    const frontMaterial = new CardMaterial({ map: frontTexture }); // Front with texture
    const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture }); // Back

    // The textures belong to the asset cache; only the materials wrapping them are ours.
    disposeCardMaterials(this.ownedMaterials);
    this.ownedMaterials = [frontMaterial, backMaterial];

    this.visibleFrontMaterial = frontMaterial;
    this.hiddenFrontMaterial = getCardColorMaterial(0x000000);

    const mesh = this.gameObject as THREE.Mesh;
    mesh.material = buildCardFaceMaterials(frontMaterial, backMaterial);
  }

  updateMaterial() {

    if (!this.card) return;

    const mesh = this.gameObject as THREE.Mesh;
    const front = this.isVisible ? this.visibleFrontMaterial : this.hiddenFrontMaterial;
    if (!Array.isArray(mesh.material) || !front) return;
    mesh.material[4] = front;
  }

  setActive(status: boolean) {
    if (status) {
      this.isActive = status;
      this.gameObject.position.copy(this.position);
      this.gameObject.position.y += this.card.originalOwner === 0 ? 0.3 : -0.3;
    } else {
      this.isActive = status;
      this.gameObject.position.copy(this.position);
    }
  }

  setIsVisible(visible: boolean) {

    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.updateMaterial();
    }
  }

  destroy() {
    disposeCardMaterials(this.ownedMaterials);
    this.ownedMaterials = [];
    this.visibleFrontMaterial = undefined;
    this.duel.destroy(this);
  }
}
