import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';
import { Ease } from "../../scripts/ease";

export class ScaleTransition extends YGOTask {
  private gameObject: THREE.Object3D;
  private startScale!: THREE.Vector3;
  private endScale!: THREE.Vector3;
  private duration: number;
  private ease: (t: number) => number;

  constructor({
    gameObject,
    scale,
    duration = 1,
    ease = Ease.linear,
  }: {
    gameObject: THREE.Object3D;
    scale: THREE.Vector3;
    duration?: number;
    ease?: (t: number) => number;
  }) {
    super();
    this.gameObject = gameObject;
    this.endScale = scale;
    this.duration = duration;
    this.ease = ease;
  }

  public start(): void {
    this.startScale = this.gameObject.scale.clone();
  }

  public update(dt: number): void {
    this.elapsedTime += dt;

    const t = Math.min(this.elapsedTime / this.duration, 1);
    const easedT = this.ease(t);

    this.gameObject.scale.lerpVectors(this.startScale, this.endScale, easedT);

    if (this.elapsedTime >= this.duration) {
      this.completeTask();
    }
  }

  public finish(): void {
    this.gameObject.scale.copy(this.endScale);
  }
}
