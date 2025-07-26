import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';
import { Ease } from "../../scripts/ease";

export class RotationTransition extends YGOTask {
    private gameObject: THREE.Object3D;
    private startRotation!: THREE.Quaternion;
    private endRotation!: THREE.Quaternion;
    private duration: number;
    private ease: (t: number) => number;

    constructor({
        gameObject,
        rotation,
        duration = 1,
        ease = Ease.linear,
    }: {
        gameObject: THREE.Object3D,
        rotation: THREE.Euler,
        duration: number,
        ease?: (t: number) => number,
    }) {
        super();

        this.gameObject = gameObject;
        this.endRotation = new THREE.Quaternion().setFromEuler(rotation);
        this.duration = duration;
        this.ease = ease;
    }

    public start(): void {
        this.startRotation = this.gameObject.quaternion.clone();
        this.elapsedTime = 0;
    }

    public update(dt: number): void {
        this.elapsedTime += dt;

        const t = Math.min(this.elapsedTime / this.duration, 1);
        const easedT = this.ease(t);

        this.gameObject.quaternion.slerpQuaternions(this.startRotation, this.endRotation, easedT);

        if (this.elapsedTime > this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.gameObject.quaternion.copy(this.endRotation);
    }
}
