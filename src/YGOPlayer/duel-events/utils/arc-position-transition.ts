import * as THREE from 'three';
import { YGOTask } from '../../core/components/tasks/YGOTask';
import { Ease } from '../../scripts/ease';

export class ArcPositionTransition extends YGOTask {
  private gameObject: THREE.Object3D;
  private startPosition!: THREE.Vector3;
  private endPosition: THREE.Vector3;
  private duration: number;
  private arcHeight: number;
  private ease: (t: number) => number;

  constructor({
    gameObject,
    position,
    duration = 1,
    arcHeight,
    ease = Ease.linear,
  }: {
    gameObject: THREE.Object3D;
    position: THREE.Vector3;
    duration?: number;
    arcHeight: number;
    ease?: (t: number) => number;
  }) {
    super();
    this.gameObject = gameObject;
    this.endPosition = position;
    this.duration = duration;
    this.arcHeight = arcHeight;
    this.ease = ease;
  }

  public start(): void {
    this.startPosition = this.gameObject.position.clone();
  }

  public update(dt: number): void {
    this.elapsedTime += dt;
    const t = Math.min(this.elapsedTime / this.duration, 1);
    const easedT = this.ease(t);

    const currentPos = new THREE.Vector3().lerpVectors(
      this.startPosition,
      this.endPosition,
      easedT
    );

    const peak = -4 * (easedT - 0.5) * (easedT - 0.5) + 1;
    currentPos.y += this.arcHeight * peak;

    this.gameObject.position.copy(currentPos);

    if (this.elapsedTime >= this.duration) {
      this.completeTask();
    }
  }
}
