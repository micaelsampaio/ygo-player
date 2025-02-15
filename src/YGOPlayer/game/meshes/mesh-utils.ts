import * as THREE from 'three';

export function CardEmptyMesh({ material, color, depth = 0.02, transparent }: { material?: THREE.Material, color?: THREE.ColorRepresentation, depth?: number, transparent?: boolean } | undefined = {}) {
    const CARD_RATIO = 1.45;
    const width = 1.9, height = width * CARD_RATIO;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const meshMaterial = material || new THREE.MeshBasicMaterial({ color, transparent });

    return new THREE.Mesh(geometry, meshMaterial);
}