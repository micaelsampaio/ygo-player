import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';

export class PositionTransition extends YGOTask {
    private gameObject: THREE.Object3D;
    private startPosition!: THREE.Vector3;
    private endPosition!: THREE.Vector3;
    private duration: number;

    constructor({
        gameObject,
        position,
        duration = 1
    }: {
        gameObject: THREE.Object3D,
        position: THREE.Vector3,
        duration: number
    }) {
        super();
        this.gameObject = gameObject;
        this.endPosition = position;
        this.duration = duration;
    }

    public start(): void {
        this.startPosition = this.gameObject.position.clone();
    }

    public update(dt: number): void {
        this.elapsedTime += dt;

        const t = Math.min(this.elapsedTime / this.duration, 1);

        this.gameObject.position.lerpVectors(this.startPosition, this.endPosition, t);

        if (this.elapsedTime > this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.gameObject.position.copy(this.endPosition);
    }
}