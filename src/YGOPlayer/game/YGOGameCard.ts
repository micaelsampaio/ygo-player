import * as THREE from "three";
import { Card } from "ygo-core";
import { YGODuel } from "../core/YGODuel";
import { GameFieldLocation } from "../types";
import { YGOMath } from "../core/YGOMath";
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from "../constants";
import { CardMaterial } from "./materials/game-card-material";

export class YGOGameCard {
  public gameObject: THREE.Mesh | null;
  public cardReference: Card | null;
  public duel: YGODuel;

  constructor({ duel }: { duel: YGODuel }) {
    this.duel = duel;
    this.gameObject = null;
    this.cardReference = null;
  }

  setCard(card: Card | null, zone: GameFieldLocation) {
    if (card === null) {
      this.destroy();
      return;
    }

    if (card && this.cardReference && this.cardReference === card) return;

    if (this.gameObject) {
      this.duel.core.scene.remove(this.gameObject);
    }
    // TODO CREATE CARD

    const textureLoader = this.duel.core.textureLoader;
    const height = CARD_HEIGHT_SIZE,
      width = height / CARD_RATIO,
      depth = CARD_DEPTH;
    const geometry = new THREE.BoxGeometry(width, height, depth);

    const frontTexture = textureLoader.load(card.images.small_url);
    const backTexture = textureLoader.load(
      `${this.duel.config.cdnUrl}/images/card_back.png`
    );
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

    this.gameObject = new THREE.Mesh(geometry, materials);
    this.cardReference = card;
    this.duel.core.scene.add(this.gameObject);
    this.gameObject.position.copy(zone.position);
    this.gameObject.rotation.copy(zone.rotation);

    if (card.position === "faceup-defense") {
      this.gameObject.rotateZ(YGOMath.degToRad(270));
    } else if (card.position === "facedown") {
      if (zone.zone.startsWith("M")) {
        this.gameObject.rotateY(YGOMath.degToRad(180));
        this.gameObject.rotateZ(YGOMath.degToRad(270));
      } else {
        this.gameObject.rotateY(YGOMath.degToRad(180));
      }
    }
  }
  destroy() {
    if (this.gameObject) this.duel.core.scene.remove(this.gameObject);
    this.gameObject = null;
    this.cardReference = null;
  }
}
