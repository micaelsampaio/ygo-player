import * as THREE from 'three';
//@ts-ignore
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
//@ts-ignore
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';

export class YGOPlayerCore {
    public scene: THREE.Scene;
    public sceneOverlay: THREE.Scene;
    public canvas: HTMLCanvasElement;
    public camera: THREE.PerspectiveCamera;
    public textureLoader: THREE.TextureLoader;
    public fontLoader: FontLoader;
    public gltfLoader: GLTFLoader;
    public renderer: THREE.WebGLRenderer;
    public deltaTime: number;
    public fonts = new Map<string, Font>();
    public mapBounds: THREE.Object3D;
    // internal
    private previousFrame: number;
    private isOverlayEnabled: boolean;

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.isOverlayEnabled = false;
        this.scene = new THREE.Scene();
        this.sceneOverlay = new THREE.Scene();
        this.canvas = canvas;
        this.deltaTime = 0;
        this.previousFrame = performance.now();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.fonts = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
        this.fontLoader = new FontLoader();

        this.renderer = new THREE.WebGLRenderer({ canvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        const mapGeometry = new THREE.PlaneGeometry(40, 25);
        const mapMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, wireframe: false });
        this.mapBounds = new THREE.Mesh(mapGeometry, mapMaterial);

        this.scene.add(this.mapBounds);
    }

    public render() {
        const now = performance.now();
        this.deltaTime = (now - this.previousFrame) / 1000;
        this.previousFrame = now;

        this.renderer.render(this.scene, this.camera);

        if (this.isOverlayEnabled) {
            this.renderer.autoClear = false;
            this.renderer.clearDepth();
            this.renderer.render(this.sceneOverlay, this.camera);
            this.renderer.autoClear = true;
        }
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

    public enableRenderOverlay() {
        this.isOverlayEnabled = true;
    }

    public disableRenderOverlay() {
        this.isOverlayEnabled = false;
        this.clearSceneOverlay();
    }

    public clearSceneOverlay() {
        while (this.sceneOverlay.children.length > 0) {
            this.sceneOverlay.remove(this.sceneOverlay.children[0]);
        }
    }

    updateCamera() {
        const box = new THREE.Box3().setFromObject(this.mapBounds);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const aspectRatio = screenWidth / screenHeight;
        const fov = this.camera.fov * (Math.PI / 180);
        const distanceHeight = Math.abs(size.y / 2 / Math.tan(fov / 2));
        const distanceWidth = Math.abs((size.x / 2) / Math.tan(fov / 2) / aspectRatio);
        const distance = Math.max(distanceHeight, distanceWidth) * 1.05;

        this.camera.position.set(center.x, center.y, distance);
        this.camera.lookAt(center);

        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();
    }
}