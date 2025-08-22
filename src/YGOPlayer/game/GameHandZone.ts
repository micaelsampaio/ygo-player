import * as THREE from 'three';
import { Object3D } from "three";
import { YGOUiElement } from "../types";
import { YGODuel } from "../core/YGODuel";
import { YGOMouseEvents } from "../core/components/YGOMouseEvents";

export class GameHandZone implements YGOUiElement {
  public player: number;
  public gameObject: Object3D;
  public isUiElement = true;
  public isGameHandZone = true;
  public onClickCb: (() => void) | undefined;

  constructor(private duel: YGODuel, player: number) {
    this.player = player;

    const plane = new THREE.PlaneGeometry(15, 6);
    const planeMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0, transparent: true }));

    this.gameObject = planeMesh;
    this.gameObject.name = "game_hand_zone";
    this.gameObject.position.set(0, 0, 7);

    this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    this.duel.core.scene.add(this.gameObject);
    this.gameObject.visible = false;
  }

  onMouseClick(): void {
    this.onClickCb?.();
  }
}