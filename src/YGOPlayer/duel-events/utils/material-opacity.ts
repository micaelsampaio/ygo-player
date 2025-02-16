import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';

export class MaterialOpacityTransition extends YGOTask {
    private material: THREE.Material;
    private startOpacity: number;
    private endOpacity: number;
    private duration: number;

    constructor({
        material,
        opacity,
        duration = 1
    }: {
        material: THREE.Material,
        opacity: number,
        duration: number
    }) {
        super();
        this.material = material;
        this.startOpacity = 0;
        this.endOpacity = opacity;
        this.duration = duration;
    }

    public start(): void {
        this.startOpacity = this.material.opacity;
        this.elapsedTime = 0;
    }

    public update(dt: number): void {
        this.elapsedTime += dt;
        const t = Math.min(this.elapsedTime / this.duration, 1);

        this.material.opacity = THREE.MathUtils.lerp(this.startOpacity, this.endOpacity, t);

        if (this.elapsedTime >= this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.material.opacity = this.endOpacity;
    }
}
