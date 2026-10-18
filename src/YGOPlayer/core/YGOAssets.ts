import * as THREE from "three";
import type { YGODuel } from "./YGODuel";
import { PoolObjects } from "./PoolObjects";
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

interface TextureWaiter {
    resolve: (texture: THREE.Texture) => void;
    reject: (error: unknown) => void;
}

export class YGOAssets {
    private duel: YGODuel;
    private textures: Map<string, THREE.Texture>;
    /** loadTexture callers waiting on a texture that is still loading, by url. */
    private textureWaiters: Map<string, TextureWaiter[]>;
    private images: Map<string, HTMLImageElement>;
    private poolObjects: Map<string, PoolObjects>;
    public models: Map<string, GLTF>;

    constructor(duel: YGODuel) {
        this.duel = duel;
        this.models = new Map();
        this.textures = new Map();
        this.textureWaiters = new Map();
        this.images = new Map<string, HTMLImageElement>();
        this.poolObjects = new Map();
    }

    async loadTextures(urls: string[]) {
        await Promise.all(urls.map(url => this.loadTexture(url)));
    }

    async loadTexture(url: string): Promise<THREE.Texture> {
        const texture = this.getTexture(url);
        const waiters = this.textureWaiters.get(url);
        if (!waiters) return texture; // already loaded
        return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
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
        return this.textures.get(url) ?? this.requestTexture(url);
    }

    /**
     * Start loading `url` and cache the Texture right away, so every request made while
     * it is still loading shares the same Texture (and GPU upload) instead of creating
     * its own. A failed load is dropped from the cache so a later request can retry.
     */
    private requestTexture(url: string): THREE.Texture {
        const waiters: TextureWaiter[] = [];
        let failed = false;
        this.textureWaiters.set(url, waiters);
        const texture = this.duel.core.textureLoader.load(url, (data) => {
            this.textureWaiters.delete(url);
            waiters.forEach(waiter => waiter.resolve(data));
        }, undefined, (error) => {
            failed = true;
            // The cache entry is ours while our waiters are registered (both are set together).
            if (this.textureWaiters.get(url) === waiters) {
                this.textureWaiters.delete(url);
                this.textures.delete(url);
            }
            waiters.forEach(waiter => waiter.reject(error));
        });
        if (!failed) this.textures.set(url, texture);
        return texture;
    }

    createPool(pool: PoolObjects) {
        this.poolObjects.set(pool.name, pool);
        pool.create();
    }

    getPool(key: string): PoolObjects {
        return this.poolObjects.get(key)!;
    }
}