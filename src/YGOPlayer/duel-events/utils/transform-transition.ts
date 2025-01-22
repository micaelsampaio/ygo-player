import * as THREE from "three";
import { YGODuel } from "../../core/YGODuel";
import { YGOTask } from "../../core/components/tasks/YGOTask";

export class TransformTransition extends YGOTask {
    private duel: YGODuel;
    private gameObject: THREE.Object3D;
    private position: THREE.Vector3 | null;
    private rotation: THREE.Quaternion | null;
    private scale: THREE.Vector3 | null;
    private duration: number;

    private startPosition!: THREE.Vector3;
    private startRotation!: THREE.Quaternion;
    private startScale!: THREE.Vector3;

    constructor({
        duel,
        gameObject,
        position,
        rotation,
        scale = null,
        duration = 0.35
    }: {
        duel: YGODuel,
        gameObject: THREE.Object3D;
        position: THREE.Vector3 | null;
        rotation: THREE.Euler | null;
        scale?: THREE.Vector3 | null;
        duration?: number;
    }) {
        super();

        this.duel = duel;
        this.gameObject = gameObject;
        this.position = position;
        this.rotation = rotation ? new THREE.Quaternion().setFromEuler(rotation) : null;
        this.scale = scale;
        this.duration = duration;
    }

    public start(): void {
        this.startPosition = this.gameObject.position.clone();
        this.startRotation = this.gameObject.quaternion.clone();
        this.startScale = this.gameObject.scale.clone();
    }

    public update(dt: number) {
        this.elapsedTime += dt;
        this.elapsedTime += this.duel.deltaTime;

        const t = this.elapsedTime / this.duration;

        if (this.position !== null) {
            this.gameObject.position.lerpVectors(this.startPosition, this.position, t);
        }

        if (this.rotation !== null) {
            this.gameObject.quaternion.slerpQuaternions(this.startRotation, this.rotation, t);
        }

        if (this.scale !== null) {
            this.gameObject.scale.lerpVectors(this.startScale, this.scale, t);
        }

        if (this.elapsedTime >= this.duration) {

            if (this.position !== null) {
                this.gameObject.position.copy(this.position);
            }
            if (this.rotation !== null) {
                this.gameObject.quaternion.copy(this.rotation);
            }
            if (this.scale !== null) {
                this.gameObject.scale.copy(this.scale);
            }
        }


    }
}
