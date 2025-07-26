import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';
import { Ease } from "../../scripts/ease";

export class PositionTransition extends YGOTask {
    private gameObject: THREE.Object3D;
    private startPosition!: THREE.Vector3;
    private endPosition: THREE.Vector3;
    private duration: number;
    private ease: (t: number) => number;

    constructor({
        gameObject,
        position,
        duration = 1,
        ease = Ease.linear,
    }: {
        gameObject: THREE.Object3D;
        position: THREE.Vector3;
        duration?: number;
        ease?: (t: number) => number;
    }) {
        super();
        this.gameObject = gameObject;
        this.endPosition = position;
        this.duration = duration;
        this.ease = ease;
    }

    public start(): void {
        this.startPosition = this.gameObject.position.clone();
    }

    public update(dt: number): void {
        this.elapsedTime += dt;
        const t = Math.min(this.elapsedTime / this.duration, 1);
        const easedT = this.ease(t);

        this.gameObject.position.lerpVectors(this.startPosition, this.endPosition, easedT);

        if (this.elapsedTime >= this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.gameObject.position.copy(this.endPosition);
    }
}
