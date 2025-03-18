import * as THREE from "three";
import { YGOEntity } from "../core/YGOEntity";

export class YGOAnimationObject extends YGOEntity {
    private animator: THREE.AnimationMixer;
    private animations: THREE.AnimationClip[] = [];
    private actions: Map<string, THREE.AnimationAction> = new Map();

    constructor({
        gameObject,
        animations = []
    }: {
        gameObject: THREE.Object3D;
        animations?: THREE.AnimationClip[]
    }) {
        super();
        this.gameObject = gameObject;
        this.animator = new THREE.AnimationMixer(gameObject);

        this.animations = animations;

        this.setupActions();
    }

    private setupActions(): void {
        this.animations.forEach(clip => {
            const action = this.animator.clipAction(clip);
            this.actions.set(clip.name, action);
        });
    }

    play(name?: string, options: {
        loop?: THREE.AnimationActionLoopStyles;
        clampWhenFinished?: boolean;
        timeScale?: number;
    } = {}): void {

        if (!name && this.animations.length > 0) {
            name = this.animations[0].name;
        }

        if (!name || !this.actions.has(name)) {
            console.warn(`Animation "${name}" not found`);
            return;
        }

        const action = this.actions.get(name)!;

        if (options.loop !== undefined) {
            action.loop = options.loop;
        }
        if (options.clampWhenFinished !== undefined) {
            action.clampWhenFinished = options.clampWhenFinished;
        }
        if (options.timeScale !== undefined) {
            action.timeScale = options.timeScale;
        }

        this.actions.forEach(a => a.stop());
        action.reset().play();
    }

    playAll(options: {
        loop?: THREE.AnimationActionLoopStyles;
        clampWhenFinished?: boolean;
        timeScale?: number;
    } = {}): void {
        if (this.animations.length === 0) {
            console.warn("No animations found to play");
            return;
        }

        this.actions.forEach(a => a.stop());

        this.actions.forEach(action => {
            if (options.loop !== undefined) {
                action.loop = options.loop;
            } else {
                action.loop = THREE.LoopOnce;
            }

            if (options.clampWhenFinished !== undefined) {
                action.clampWhenFinished = options.clampWhenFinished;
            } else {
                action.clampWhenFinished = true;
            }

            if (options.timeScale !== undefined) {
                action.timeScale = options.timeScale;
            } else {
                action.timeScale = 1;
            }

            action.reset().play();
        });
    }

    stop(name?: string): void {
        if (name && this.actions.has(name)) {
            this.actions.get(name)!.stop();
        } else if (!name) {
            // Stop all animations
            this.actions.forEach(action => action.stop());
        }
    }

    isPlaying(name?: string): boolean {
        if (!name) {
            let anyPlaying = false;
            this.actions.forEach(action => {
                if (action.isRunning()) {
                    anyPlaying = true;
                }
            });
            return anyPlaying;
        }

        if (this.actions.has(name)) {
            return this.actions.get(name)!.isRunning();
        }

        return false;
    }

    getCurrentAnimation(): string | null {
        let currentAnimation: string | null = null;

        this.actions.forEach((action, name) => {
            if (action.isRunning()) {
                currentAnimation = name;
            }
        });

        return currentAnimation;
    }

    update(dt: number): void {
        this.animator.update(dt);
    }
}