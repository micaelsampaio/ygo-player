import * as THREE from 'three';
//@ts-ignore
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
//@ts-ignore
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';

export class YGOPlayerCore {
    public scene: THREE.Scene;
    public canvas: HTMLCanvasElement;
    public camera: THREE.PerspectiveCamera;
    public textureLoader: THREE.TextureLoader;
    public fontLoader: FontLoader;
    public gltfLoader: GLTFLoader;
    public renderer: THREE.WebGLRenderer;
    public deltaTime: number;
    private previousFrame: number;
    public fonts = new Map<string, Font>();

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.scene = new THREE.Scene();
        this.canvas = canvas;
        this.deltaTime = 0;
        this.previousFrame = performance.now();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.fonts = new Map();
        // const aspect = window.innerWidth / window.innerHeight;
        // const frustumSize = 15;  // Size of the camera's frustum
        // this.camera = new THREE.OrthographicCamera(
        //     -frustumSize * aspect / 2,  // left
        //     frustumSize * aspect / 2,   // right
        //     frustumSize / 2,           // top
        //     -frustumSize / 2,          // bottom
        //     0.1,                       // near plane
        //     1000                       // far plane
        // );
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.fontLoader = new FontLoader();
        this.renderer = new THREE.WebGLRenderer({ canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render() {
        const now = performance.now();
        this.deltaTime = (now - this.previousFrame) / 1000;
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
                (error) => reject(error as Error)
            );
        });
    }

    public async loadFontAsync(name: string, url: string): Promise<Font> {
        return new Promise((resolve) => {
            this.fontLoader.load(url, (font: any) => {
                resolve(font);
                this.fonts.set(name, font);
            })
        })
    }
}