import * as THREE from "three";
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { GameCard } from "./GameCard";
import { Card, FieldZone, FieldZoneData } from "ygo-core";
import { ActionCardZoneMenu } from "../actions/ActionCardZoneMenu";
import { getCardRotation } from "../scripts/ygo-utils";
import { YGOGameUtils } from "ygo-core";

export class CardZone extends YGOEntity implements YGOUiElement {
  public isUiElement: boolean = true;
  public isUiElementClick: boolean = true;

  private duel: YGODuel;
  public zone: FieldZone;
  public zoneData: FieldZoneData;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public size: THREE.Vector2;
  public scale: THREE.Vector3;
  public player: number;
  private mesh: THREE.Mesh;
  private normalMaterial: THREE.MeshBasicMaterial;
  private hoverMaterial: THREE.MeshBasicMaterial;
  private card: GameCard | null;
  public onClickCb: ((cardZone: CardZone) => void) | null;

  constructor({
    duel,
    player,
    position,
    rotation,
    zone,
  }: {
    duel: YGODuel;
    player: number;
    zone: FieldZone;
    position: THREE.Vector3;
    rotation: THREE.Euler;
  }) {
    super();
    this.duel = duel;
    this.zone = zone;
    this.position = position;
    this.rotation = rotation;
    this.player = player;
    this.card = null;
    this.zoneData = YGOGameUtils.getZoneData(this.zone);

    if (this.zone.startsWith("S") || this.zone.startsWith("F")) {
      this.size = new THREE.Vector2(4, 3.5);
      this.scale = new THREE.Vector3(1, 1, 1).multiplyScalar(0.85);
    } if (this.zone.startsWith("F")) {
      this.size = new THREE.Vector2(2.85, 3.6);
      this.scale = new THREE.Vector3(1, 1, 1).multiplyScalar(0.9);
    } else {
      this.size = new THREE.Vector2(4, 4);
      this.scale = new THREE.Vector3(1, 1, 1);
    }

    const geometry = new THREE.PlaneGeometry(this.size.x, this.size.y);
    this.normalMaterial = new THREE.MeshBasicMaterial({
      color: zone.startsWith("M") ? 0x00ff00 : 0x0000ff,
      transparent: true,
      opacity: 0,
    });
    this.hoverMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });

    const cube = new THREE.Mesh(geometry, this.normalMaterial);
    cube.position.copy(this.position);
    cube.position.z += 0.05;
    cube.rotation.copy(this.rotation);

    this.duel.core.scene.add(cube);
    this.gameObject = cube;
    this.mesh = cube;

    this.position = cube.position.clone();
    this.position.z += 0.02;
    this.onClickCb = null;

    this.duel.gameController
      .getComponent<YGOMouseEvents>("mouse_events")
      ?.registerElement(this);
  }

  onMouseClick(event: MouseEvent): void {
    this.duel.events.dispatch("set-selected-card", {
      player: 0,
      card: this.getCardReference(),
    });

    if (!this.onClickCb) {
      event.preventDefault();
      event.stopPropagation();

      if (this.getCardReference()) {
        if (this.duel.config.autoChangePlayer) {
          this.duel.setActivePlayer(this.player);
        }

        const action =
          this.duel.actionManager.getAction<ActionCardZoneMenu>(
            "card-zone-menu"
          );
        action.setData({
          duel: this.duel,
          gameCard: this.card,
          card: this.card!.cardReference,
          zone: this.zone,
          mouseEvent: event,
        });
        this.duel.actionManager.setAction(action);
      } else {
        this.duel.actionManager.clearAction();
        this.duel.events.dispatch("clear-ui-action");
      }
    }

    if (this.onClickCb) {
      this.onClickCb(this);
    }
  }

  onMouseEnter(event: MouseEvent): void {
    this.mesh.material = this.hoverMaterial;
  }

  onMouseLeave(event: MouseEvent): void {
    this.mesh.material = this.normalMaterial;
  }

  setCard(card: Card | null) {
    if (!card) {
      this.destroyCard();
      return;
    }

    if (card === this.getCardReference()) return;

    if (this.card) this.card.destroy();

    this.card = new GameCard({ duel: this.duel, card });

    this.card.gameObject.scale.copy(this.scale);

    this.updateZoneData();
  }

  setGameCard(card: GameCard | null) {
    if (card === this.card) return;

    if (!card) {
      this.destroyCard();
      return;
    }

    this.card = card;

    this.updateCard();
  }

  getGameCard(): GameCard {
    return this.card!;
  }

  getCardReference(): Card | null {
    return this.card?.cardReference || null;
  }

  removeCard() {
    if (this.card) {
      this.card = null;
    }
  }

  destroyCard() {
    if (this.card) {
      this.card.destroy();
      this.card = null;
    }
  }

  updateCard() {
    if (!this.card) return;

    const card = this.getCardReference();

    if (!card) return;

    this.updateZoneData();

    const rotation = getCardRotation(
      this.duel,
      this.getCardReference()!,
      this.zone
    );
    this.card.gameObject.position.copy(this.position);
    this.card.gameObject.rotation.copy(rotation);
    this.card.gameObject.scale.copy(this.scale);
    this.card.showCardStats();
    this.card.updateCardStats(this.zoneData);
    this.card.gameObject.visible = true;
  }

  private updateZoneData() {
    if (
      this.zoneData.zone === "EMZ" &&
      this.card &&
      this.card.cardReference &&
      this.zoneData.player !== this.card.cardReference.originalOwner
    ) {
      this.zoneData.player = this.card.cardReference.originalOwner;
      this.zone = `EMZ${this.zoneData.player === 0 ? "" : "2"}-${this.zoneData.zoneIndex + 1
        }` as any;
    }
  }

  isEmpty() {
    return !this.card;
  }

  hasCard() {
    return !!this.card;
  }
}
