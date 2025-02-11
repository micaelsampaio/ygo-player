import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { Card, FieldZoneData } from '../../YGOCore/types/types';
import { YGOGameUtils } from '../../YGOCore';
import { GameCardStats } from './GameCardStats';

export class GameCard extends YGOEntity {
    private duel: YGODuel;
    public zone: string = ""; // TODO USE THIS ??
    public cardReference!: Card;

    private cardStats: GameCardStats | undefined;
    private hasStats: boolean;

    constructor({ duel, card, stats = true }: { duel: YGODuel, card?: Card, stats?: boolean }) {
        super();

        this.duel = duel;
        this.hasStats = stats;

        const CARD_RATIO = 1.45;
        const width = 1.8, height = width * CARD_RATIO, depth = 0.02;
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const frontMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Depth
        const backMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Depth
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial,  // Bottom (depth)
            frontMaterial, // Front
            backMaterial,  // Back
        ];

        this.gameObject = new THREE.Mesh(geometry, materials);

        this.duel.core.scene.add(this.gameObject);

        if (card) this.setCard(card);
    }

    setCard(card: Card) {
        this.cardReference = card;

        const frontTexture = this.duel.assets.getTexture(`http://127.0.0.1:8080/images/cards_small/${card.id}.jpg`);
        const backTexture = this.duel.assets.getTexture('http://127.0.0.1:8080/images/card_back.png');
        const frontMaterial = new THREE.MeshBasicMaterial({ map: frontTexture }); // Front with texture
        const backMaterial = new THREE.MeshBasicMaterial({ map: backTexture });  // Back
        const depthMaterial = new THREE.MeshBasicMaterial({ color: 0xb5b5b5 }); // Depth

        const materials = [
            depthMaterial, // Right (depth)
            depthMaterial, // Left (depth)
            depthMaterial, // Top (depth)
            depthMaterial,  // Bottom (depth)
            frontMaterial, // Front
            backMaterial,  // Back
        ];

        const mesh = this.gameObject as THREE.Mesh;
        mesh.material = materials;

        this.gameObject.name = card.name;
    }

    public updateCardStats(zoneData: FieldZoneData) {
        if (!this.hasStats) return;

        if (zoneData.zone === "S" && this.cardStats) {
            this.cardStats.hide();
            return;
        }

        if (YGOGameUtils.isSpellTrap(this.cardReference)) {
            return;
        }

        if (!this.cardStats) {
            this.cardStats = new GameCardStats({
                card: this.cardReference,
                duel: this.duel,
                parent: this.gameObject,
            });
            this.cardStats.card = this.cardReference;
            this.cardStats.duel = this.duel;
            this.cardStats.parent = this.gameObject;
        }

        if (YGOGameUtils.isFaceDown(this.cardReference)) {
            this.cardStats.hide();
        } else {
            this.cardStats.show();
        }

        this.cardStats.render();
    }

    public hideCardStats() {
        if (this.cardStats) this.cardStats.hide();
    }

    public showCardStats() {
        if (this.cardStats) this.cardStats.show();
    }

    private destroyCardStats() {
        if (this.cardStats) {
            this.cardStats.destroy();
        }
    }

    destroy() {
        this.destroyCardStats();
        this.duel.destroy(this);
    }
}