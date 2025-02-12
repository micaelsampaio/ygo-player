import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { Card, FieldZoneData } from '../../YGOCore/types/types';
import { YGOGameUtils } from '../../YGOCore';
import { GameCardStats } from './GameCardStats';

export class GameBackCard extends YGOEntity {
    private duel: YGODuel;

    constructor({ duel }: { duel: YGODuel }) {
        super();

        this.duel = duel;

        const CARD_RATIO = 1.45;
        const width = 1.9, height = width * CARD_RATIO, depth = 0.02;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const backTexture = this.duel.assets.getTexture('http://127.0.0.1:8080/images/card_back.png');
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