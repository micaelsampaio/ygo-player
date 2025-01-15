import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';

export class ScaleTransition extends YGOTask {
    private gameObject: THREE.Object3D;
    private startScale!: THREE.Vector3;
    private endScale!: THREE.Vector3;
    private duration: number;

    constructor({
        gameObject,
        scale,
        duration = 1
    }: {
        gameObject: THREE.Object3D,
        scale: THREE.Vector3,
        duration: number
    }) {
        super();
        this.gameObject = gameObject;
        this.endScale = scale;
        this.duration = duration;
    }

    public start(): void {
        this.startScale = this.gameObject.scale.clone();
    }

    public update(dt: number): void {
        this.elapsedTime += dt;

        const t = Math.min(this.elapsedTime / this.duration, 1);

        this.gameObject.scale.lerpVectors(this.startScale, this.endScale, t);

        if (this.elapsedTime > this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.gameObject.scale.copy(this.endScale);
    }
}