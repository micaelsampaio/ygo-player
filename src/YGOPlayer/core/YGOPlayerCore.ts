import * as THREE from 'three';
//@ts-ignore
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export class YGOPlayerCore {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public textureLoader: THREE.TextureLoader;
    public fontLoader: FontLoader;
    public gltfLoader: GLTFLoader;
    public renderer: THREE.WebGLRenderer;
    public deltaTime: number;
    private previousFrame: number;

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.scene = new THREE.Scene();
        this.deltaTime = 0;
        this.previousFrame = performance.now();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.fontLoader = new FontLoader();
        this.renderer = new THREE.WebGLRenderer({ canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render() {
        const now = performance.now();
        this.deltaTime = now - this.previousFrame;
        this.previousFrame = now;

        this.renderer.render(this.scene, this.camera);
    }

    public async loadGLTFAsync(url: string): Promise<GLTF> {
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf: GLTF) => resolve(gltf),
                undefined,
                (error: Error) => reject(error)
            );
        });
    }
}