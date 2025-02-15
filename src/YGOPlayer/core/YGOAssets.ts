import * as THREE from "three";
import { YGODuel } from "./YGODuel";

export class YGOAssets {

    private duel: YGODuel;
    private textures: Map<string, THREE.Texture>;
    private images: Map<string, HTMLImageElement>;

    constructor(duel: YGODuel) {
        this.duel = duel;
        this.textures = new Map();
        this.images = new Map<string, HTMLImageElement>();
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

    async loadImage(url: string) {
        if (this.images.has(url)) {
            return this.images.get(url);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this.images.set(url, img);
                resolve(img)
            }
            img.onerror = () => {
                reject(new Error("cant load image from " + url))
            }
        })
    }
    async loadImages(...urls: string[]) {
        await Promise.allSettled(urls.map(url => this.loadImage(url)));
    }

    public getImage(url: string): HTMLImageElement {
        return this.images.get(url)!;
    }

    getTexture(url: string): THREE.Texture {

        if (this.textures.has(url)) return this.textures.get(url)!;

        return this.duel.core.textureLoader.load(url, (data) => this.textures.set(url, data));
    }
}