import * as THREE from 'three';
//@ts-ignore
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
//@ts-ignore
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';
import { EventBus } from '../scripts/event-bus';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const globalUniforms = {
    time: { value: 0.0 }
};

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
    public unscaledDeltaTime: number;
    public fonts = new Map<string, Font>();
    public mapBounds: THREE.Object3D;
    public events: EventBus<any>;
    public pov: number = 0;

    // time
    public timeScale: number;

    // internal
    private previousFrame: number;
    private isOverlayEnabled: boolean;
    private eventsController: AbortController;

    // globals
    public globalUniforms = globalUniforms;

    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
        this.events = new EventBus();
        this.isOverlayEnabled = false;
        this.scene = new THREE.Scene();
        this.sceneOverlay = new THREE.Scene();
        this.canvas = canvas;
        this.deltaTime = 0;
        this.unscaledDeltaTime = 0;
        this.timeScale = 1;
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
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        const mapGeometry = new THREE.PlaneGeometry(40, 25);
        const mapMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, wireframe: false });
        this.mapBounds = new THREE.Mesh(mapGeometry, mapMaterial);

        this.scene.add(this.mapBounds);

        this.eventsController = new AbortController();

        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.render();
            this.updateCamera();
            this.events.dispatch("resize");
        }, { signal: this.eventsController.signal });
    }

    public render() {
        const now = performance.now();
        this.unscaledDeltaTime = (now - this.previousFrame) / 1000;
        this.deltaTime = this.unscaledDeltaTime * this.timeScale;
        this.previousFrame = now;
        this.globalUniforms.time.value = performance.now() / 1000;

        this.renderer.render(this.scene, this.camera);

        // (this as any).controls.update();

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

    updateCamera(changePov = false) {
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

        // Compute a default camera position in front of the map center
        const defaultPos = new THREE.Vector3(center.x, center.y, center.z + distance);

        if (!changePov) {
            this.camera.position.copy(defaultPos);
            this.camera.up.set(0, 1, 0);
        } else {
            // Determine vector from center to camera; if camera is not placed yet,
            // start from the default vector.
            const fromCenter = new THREE.Vector3().subVectors(this.camera.position, center);
            if (fromCenter.length() < 1e-6) {
                fromCenter.copy(new THREE.Vector3(0, 0, distance));
            }

            // Rotate 180 degrees around X axis
            fromCenter.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

            // Set camera position to center + rotated vector
            this.camera.position.copy(center).add(fromCenter);

            // Invert up vector so the scene doesn't appear upside-down
            this.camera.up.set(0, -1, 0);
        }

        this.camera.lookAt(center);

        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();
        console.log('Camera updated:', this.camera.position, 'looking at', center, 'distance:', distance, 'changePov:', changePov);
    }

    setTimeScale(value: number) {
        const changed = value !== this.timeScale;

        if (changed) {
            this.timeScale = value;
            this.events.dispatch("on-timescale-change", this.timeScale);
        }
    }

    destroy() {
        this.eventsController.abort();
        this.destroyScene(this.scene);
        this.destroyScene(this.sceneOverlay);
    }

    private destroyScene(scene: THREE.Scene) {
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        // Remove all children
        while (scene.children.length > 0) {
            const child = scene.children[0];
            scene.remove(child);
        }
    }
}