import * as THREE from "three";
import { YGODuel } from "./YGODuel";

export class YGOAssets {
    private duel: YGODuel;
    private textures: Map<string, THREE.Texture>;

    constructor(duel: YGODuel) {
        this.duel = duel;
        this.textures = new Map();
    }

    async loadTextures(urls: string[]) {
        await Promise.all(urls.map(url => this.loadTexture(url)));
    }

    async loadTexture(url: string) {
        return new Promise((resolve, reject) => {
            this.duel.core.textureLoader.load(url, (data) => {
                this.textures.set(url, data);
                resolve(data);
            }, undefined, reject);
        })
    }

    getTexture(url: string): THREE.Texture {

        if (this.textures.has(url)) return this.textures.get(url)!;

        return this.duel.core.textureLoader.load(url, (data) => this.textures.set(url, data));
    }
}