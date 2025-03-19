import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { CARD_DEPTH, CARD_HEIGHT_SIZE, CARD_RATIO } from '../constants';

export class GameBackCard extends YGOEntity {
    private duel: YGODuel;

    constructor({ duel }: { duel: YGODuel }) {
        super();

        this.duel = duel;

        const height = CARD_HEIGHT_SIZE, width = height / CARD_RATIO, depth = CARD_DEPTH;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const backTexture = this.duel.assets.getTexture(`${this.duel.config.cdnUrl}/images/card_back.png`);
        const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture });  // Back
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial,  // Bottom (depth)
            depthMaterial, // Front
            backMaterial,  // Back
        ];

        this.gameObject = new THREE.Mesh(geometry, materials);

        this.duel.core.scene.add(this.gameObject);

    }

    destroy() {
        this.duel.destroy(this);
    }
}