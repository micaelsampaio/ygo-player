import { YGOTask } from "../../core/components/tasks/YGOTask";
import * as THREE from 'three';
import { Ease } from "../../scripts/ease";

export class MaterialOpacityTransition extends YGOTask {
    private material: THREE.Material;
    private startOpacity: number;
    private endOpacity: number;
    private duration: number;
    private ease: (t: number) => number;

    constructor({
        material,
        opacity,
        duration = 1,
        ease = Ease.linear
    }: {
        material: THREE.Material,
        opacity: number,
        duration?: number,
        ease?: (t: number) => number
    }) {
        super();
        this.material = material;
        this.startOpacity = 0;
        this.endOpacity = opacity;
        this.duration = duration;
        this.ease = ease;
    }

    public start(): void {
        this.startOpacity = this.material.opacity;
        this.elapsedTime = 0;
    }

    public update(dt: number): void {
        this.elapsedTime += dt;
        const t = Math.min(this.elapsedTime / this.duration, 1);
        const easedT = this.ease(t);
        this.material.opacity = THREE.MathUtils.lerp(this.startOpacity, this.endOpacity, easedT);
        if (this.elapsedTime >= this.duration) {
            this.completeTask();
        }
    }

    public finish(): void {
        this.material.opacity = this.endOpacity;
    }
}
