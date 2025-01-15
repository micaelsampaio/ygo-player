import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';

export class RotationTransition extends YGOTask {
    private gameObject: THREE.Object3D;
    private startRotation!: THREE.Quaternion;
    private endRotation!: THREE.Quaternion;
    private duration: number;

    constructor({
        gameObject,
        rotation,
        duration = 1
    }: {
        gameObject: THREE.Object3D,
        rotation: THREE.Euler,
        duration: number
    }) {
        super();
        this.gameObject = gameObject;
        this.endRotation = new THREE.Quaternion().setFromEuler(rotation);
        this.duration = duration;
    }

    public start(): void {
        this.startRotation = this.gameObject.quaternion.clone();
        this.elapsedTime = 0;
    }

    public update(dt: number): void {
        this.elapsedTime += dt;

        const t = Math.min(this.elapsedTime / this.duration, 1);

        this.gameObject.quaternion.slerpQuaternions(this.startRotation, this.endRotation, t);

        if (this.elapsedTime > this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.gameObject.quaternion.copy(this.endRotation);
    }
}
