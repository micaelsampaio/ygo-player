import * as THREE from 'three';
import { YGOEntity } from '../core/YGOEntity';

export class TrailRenderer extends YGOEntity {
    private points: THREE.Vector3[] = [];
    private maxPoints: number = 100;
    private trailMesh: THREE.Mesh | null = null;
    private trailGeometry: THREE.BufferGeometry | null = null;
    private material: THREE.Material | null = null;
    private width: number = 0.5;
    private color: THREE.Color = new THREE.Color(0xffffff);
    private texture: THREE.Texture | null = null;
    private fadeTime: number = 2.0; // Time in seconds before points start to fade
    private pointTimes: number[] = [];
    private currentTime: number = 0;
    private targetObject: THREE.Object3D | null = null;
    private camera: THREE.Camera | null = null; // Camera reference

    constructor() {
        super();
        // Initialize the trail with empty geometry
        this.trailGeometry = new THREE.BufferGeometry();
        this.material = new THREE.MeshBasicMaterial({
            color: this.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        });

        this.trailMesh = new THREE.Mesh(this.trailGeometry, this.material);
        this.gameObject = this.trailMesh;
    }

    // Set the target object to follow
    setTarget(target: THREE.Object3D): void {
        this.targetObject = target;
    }

    // Set the camera to make the trail face towards it
    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
    }

    // Set the trail color
    setColor(color: THREE.Color | string | number): void {
        if (typeof color === 'string' || typeof color === 'number') {
            this.color = new THREE.Color(color);
        } else {
            this.color = color;
        }

        if (this.material && this.material instanceof THREE.MeshBasicMaterial) {
            this.material.color = this.color;
            this.texture = null; // Remove texture if we're using a color
        }
    }

    // Set the trail texture from an image URL
    setTexture(imageUrl: string): void {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(imageUrl, (loadedTexture) => {
            this.texture = loadedTexture;
            if (this.material) {
                if (this.material instanceof THREE.MeshBasicMaterial) {
                    this.material.map = this.texture;
                    this.material.needsUpdate = true;
                } else {
                    // If the material is not a MeshBasicMaterial, create a new one
                    const newMaterial = new THREE.MeshBasicMaterial({
                        map: this.texture,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 1.0
                    });
                    if (this.trailMesh) {
                        this.trailMesh.material = newMaterial;
                        this.material = newMaterial;
                    }
                }
            }
        });
    }

    // Set the width of the trail
    setWidth(width: number): void {
        this.width = width;
    }

    // Set the maximum number of points in the trail
    setMaxPoints(maxPoints: number): void {
        this.maxPoints = maxPoints;
    }

    // Set the fade time in seconds
    setFadeTime(fadeTime: number): void {
        this.fadeTime = fadeTime;
    }

    update(dt: number): void {
        // Update time
        this.currentTime += dt;

        // Get position to track - either target object or self
        let currentPosition;
        if (this.targetObject) {
            // Get world position of the target object
            const worldPos = new THREE.Vector3();
            this.targetObject.getWorldPosition(worldPos);
            currentPosition = worldPos;
        } else {
            // Use own position if no target is set
            currentPosition = this.gameObject.position.clone();
        }

        // Only add a new point if there's enough distance or it's the first point
        const shouldAddPoint = this.points.length === 0 ||
            currentPosition.distanceTo(this.points[this.points.length - 1]) > 0.1;

        if (shouldAddPoint) {
            this.points.push(currentPosition.clone()); // Clone to ensure we store a copy
            this.pointTimes.push(this.currentTime);

            // Remove old points if we exceed the maximum
            if (this.points.length > this.maxPoints) {
                this.points.shift();
                this.pointTimes.shift();
            }
        }

        // Update the trail geometry
        this.updateTrailGeometry();
    }

    private updateTrailGeometry(): void {
        if (this.points.length < 2) return;

        const vertices: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const colors: number[] = [];

        if (this.camera) {
            // Transform the camera position into a vector
            const cameraPosition = new THREE.Vector3();
            this.camera.getWorldPosition(cameraPosition);

            for (let i = 0; i < this.points.length - 1; i++) {
                const p1 = this.points[i];
                const p2 = this.points[i + 1];

                // Calculate direction vector
                const direction = new THREE.Vector3().subVectors(p2, p1).normalize();

                // Calculate perpendicular vector (for making quads)
                const up = new THREE.Vector3(0, 1, 0);
                let right = new THREE.Vector3().crossVectors(direction, up).normalize();

                // If right is zero (direction is parallel to up), use another reference
                if (right.length() < 0.1) {
                    const alt = new THREE.Vector3(1, 0, 0);
                    right.crossVectors(direction, alt).normalize();
                }

                // Add vertices to form a quad
                const p1Left = new THREE.Vector3().addVectors(p1, right.clone().multiplyScalar(this.width / 2));
                const p1Right = new THREE.Vector3().subVectors(p1, right.clone().multiplyScalar(this.width / 2));
                const p2Left = new THREE.Vector3().addVectors(p2, right.clone().multiplyScalar(this.width / 2));
                const p2Right = new THREE.Vector3().subVectors(p2, right.clone().multiplyScalar(this.width / 2));

                // Apply look-at transformation to the trail points (so it always faces the camera)
                const lookAtDirection = cameraPosition.clone().sub(p1).normalize();
                const axis = new THREE.Vector3(0, 1, 0);
                const angle = Math.atan2(lookAtDirection.z, lookAtDirection.x);
                const rotationMatrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
                p1Left.applyMatrix4(rotationMatrix);
                p1Right.applyMatrix4(rotationMatrix);
                p2Left.applyMatrix4(rotationMatrix);
                p2Right.applyMatrix4(rotationMatrix);

                // Add UVs, colors, and indices as before
                const vIndex = vertices.length / 3;
                vertices.push(
                    p1Left.x, p1Left.y, p1Left.z,
                    p1Right.x, p1Right.y, p1Right.z,
                    p2Left.x, p2Left.y, p2Left.z,
                    p2Right.x, p2Right.y, p2Right.z
                );

                const uCoordStart = i / (this.points.length - 1);
                const uCoordEnd = (i + 1) / (this.points.length - 1);
                uvs.push(
                    uCoordStart, 0,
                    uCoordStart, 1,
                    uCoordEnd, 0,
                    uCoordEnd, 1
                );

                const age = this.currentTime - this.pointTimes[i];
                const opacity = Math.max(0, 1 - (age / this.fadeTime));

                for (let j = 0; j < 4; j++) {
                    colors.push(this.color.r, this.color.g, this.color.b, opacity);
                }

                indices.push(
                    vIndex, vIndex + 1, vIndex + 2,
                    vIndex + 1, vIndex + 3, vIndex + 2
                );
            }
        }

        // Update the geometry
        if (this.trailGeometry) {
            this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            this.trailGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
            this.trailGeometry.setIndex(indices);
            this.trailGeometry.computeVertexNormals();

            if (this.material instanceof THREE.MeshBasicMaterial) {
                this.material.vertexColors = true;
                this.material.needsUpdate = true;
            }
        }
    }

    clearTrail(): void {
        this.points = [];
        this.pointTimes = [];
        if (this.trailGeometry) {
            this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            this.trailGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([], 2));
            this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute([], 4));
            this.trailGeometry.setIndex([]);
        }
    }

    dispose(): void {
        if (this.trailGeometry) {
            this.trailGeometry.dispose();
        }

        if (this.material) {
            this.material.dispose();
        }

        if (this.texture) {
            this.texture.dispose();
        }
    }
}
