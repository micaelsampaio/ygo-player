import { YGOComponent } from "./YGOComponent";
import * as THREE from 'three';

export abstract class YGOEntity {
    public name: string = ""
    private components: Record<string, YGOComponent> = {};
    public gameObject!: THREE.Object3D;
    public enabled: boolean = true;

    constructor() {

    }

    create() {

    }

    addComponent(name: string, component: YGOComponent) {
        this.components[name] = component;
        component.start();
    }

    getComponent<T = YGOComponent>(name: string): T {
        const component = this.components[name] as T;
        return component;
    }


    destroyEntity() {
        this.enabled = false;
        this.onDestroy();

        for (const component of Object.values(this.components)) {
            component.onDestroy();
        }
    }

    onDestroy() {

    }

    removeComponent<T = YGOComponent>(component: string | YGOComponent): T | null {

        if (typeof component === "string") {
            const comp = this.components[component] as T;
            delete this.components[component];
            return comp || null;
        }

        const index = Object.values(this.components).findIndex(c => c === component);

        if (index === -1) return null;

        const key = Object.keys(component)[index];
        const comp = this.components[key] as T;
        delete this.components[key];

        return comp || null;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    setActive(enabled: boolean) {
        this.enabled = enabled;
    }

    update(dt: number) {
        for (const component of Object.values(this.components)) {
            if (!component.enabled) continue;
            component.update(dt);
        }
    }
}