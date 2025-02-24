import * as THREE from 'three';

export function CardEmptyMesh({ material, color, depth = 0.02, transparent }: { material?: THREE.Material, color?: THREE.ColorRepresentation, depth?: number, transparent?: boolean } | undefined = {}) {
    const CARD_RATIO = 1.45;
    const width = 1.9, height = width * CARD_RATIO;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const meshMaterial = material || new THREE.MeshBasicMaterial({ color, transparent });

    return new THREE.Mesh(geometry, meshMaterial);
}

export function GameModalOverlayMesh() {
    const modalGeometry = new THREE.PlaneGeometry(1, 1);
    const modalMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
    });

    const modalPlane = new THREE.Mesh(modalGeometry, modalMaterial);
    modalPlane.scale.set(20, 20, 20);
    modalPlane.position.set(0, 0, 14);

    return modalPlane;
}