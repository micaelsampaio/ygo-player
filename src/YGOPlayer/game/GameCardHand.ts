import * as THREE from "three";
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from "../core/YGODuel";
import { Card } from "ygo-core";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { ActionCardHandMenu } from "../actions/ActionCardHandMenu";
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from "../constants";
import { CardMaterial } from "./materials/game-card-material";

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
  private startMouseClickTime: number;

  constructor({ duel, player }: { duel: YGODuel; player: number }) {
    super();

    this.duel = duel;

    const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO, depth = CARD_DEPTH;
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const frontMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Depth
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
    this.handIndex = 0;
    this.gameObject = new THREE.Mesh(geometry, materials);
    this.position = this.gameObject.position;
    this.duel.core.scene.add(this.gameObject);
    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    this.isActive = false;
    this.player = player;
    this.startMouseClickTime = -1;
    (this.gameObject as any).isUiCardElement = true;
  }

  onMouseClick?(event: MouseEvent): void {
    if (!this.isUiElementClick) return;
    event.preventDefault();
    event.stopPropagation();

    if (this.startMouseClickTime + 1000 < Date.now()) {
      this.setActive(false);
      return;
    };

    const action = this.duel.actionManager.getAction<ActionCardHandMenu>("card-hand-menu");

    if (this.duel.actionManager.action === action && action.data.card === this.card) {
      this.duel.actionManager.clearAction();
      return;
    }

    this.duel.events.dispatch("set-selected-card", {
      player: this.card.originalOwner,
      card: this.card,
    });

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
    if (!this.isUiElementHover) return;
    this.gameObject.position.copy(this.position);
    this.gameObject.position.y += this.card.originalOwner === 0 ? 0.3 : -0.3;
  }

  onMouseLeave?(event: MouseEvent): void {
    if (this.isActive) return;
    if (!this.isUiElementHover) return;
    this.gameObject.position.copy(this.position);
  }

  onMouseDown?(event: MouseEvent): void {
    this.startMouseClickTime = Date.now();
    this.duel.events.dispatch("on-card-mouse-down", { card: this.card, event });
  }

  onMouseUp?(event: MouseEvent): void {
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

  destroy() {
    this.duel.destroy(this);
  }
}
