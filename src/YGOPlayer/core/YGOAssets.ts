import * as THREE from "three";
import { YGODuel } from "./YGODuel";
import { PoolObjects } from "./PoolObjects";
//@ts-ignore
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class YGOAssets {
    private duel: YGODuel;
    private textures: Map<string, THREE.Texture>;
    private images: Map<string, HTMLImageElement>;
    private poolObjects: Map<string, PoolObjects>;
    public models: Map<string, GLTF>;

    constructor(duel: YGODuel) {
        this.duel = duel;
        this.models = new Map();
        this.textures = new Map();
        this.images = new Map<string, HTMLImageElement>();
        this.poolObjects = new Map();
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

    public async loadGLTF(url: string): Promise<GLTF> {
        const model = await this.duel.core.loadGLTFAsync(url)
        this.models.set(url, model);
        return model;
    }

    getTexture(url: string): THREE.Texture {

        if (this.textures.has(url)) return this.textures.get(url)!;

        return this.duel.core.textureLoader.load(url, (data) => this.textures.set(url, data));
    }

    createPoool(pool: PoolObjects) {
        this.poolObjects.set(pool.name, pool);
    }

    getPool(key: string): PoolObjects {
        const pool = this.poolObjects.get(key);
        return pool as any;
    }
}