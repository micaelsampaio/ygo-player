import * as THREE from "three";
import { YGODuel } from "../core/YGODuel";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";
import { CardZone } from "./CardZone";

export class BattlePhaseButton implements YGOUiElement {
  public gameObject: THREE.Mesh;
  public material: THREE.Material;
  public isUiElement = true;
  public cardZone!: CardZone;
  public position!: THREE.Vector3;
  public rotation!: THREE.Euler;
  public onClickCb?: () => void;

  constructor(private duel: YGODuel) {
    const texture = this.duel.core.textureLoader.load(duel.createCdnUrl("/images/sprites/attack_icon.png"));
    this.material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const plane = new THREE.PlaneGeometry(3, 3);
    const planeMesh = new THREE.Mesh(plane, this.material);
    this.gameObject = planeMesh;
    this.gameObject.name = "attack_button";
    this.duel.core.scene.add(this.gameObject);
    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
  }

  hide() {
    this.gameObject.visible = false;
  }

  show() {
    this.gameObject.visible = true;
  }

  onMouseClick(): void {
    this.onClickCb?.();
  }
}