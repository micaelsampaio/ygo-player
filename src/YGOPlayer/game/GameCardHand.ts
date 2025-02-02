import * as THREE from 'three';
import { YGOEntity } from "../core/YGOEntity";
import { YGODuel } from '../core/YGODuel';
import { Card } from '../../YGOCore/types/types';
import { YGOUiElement } from '../types';
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { ActionCardHandMenu } from '../actions/ActionCardHandMenu';

export class GameCardHand extends YGOEntity implements YGOUiElement {
    private duel: YGODuel;
    public card!: Card;
    public handIndex: number;
    public position: THREE.Vector3;
    public isActive: boolean;

    constructor({ duel }: { duel: YGODuel }) {
        super();

        this.duel = duel;

        const CARD_RATIO = 1.45;
        const width = 2, height = width * CARD_RATIO, depth = 0.02;
        const geometry = new THREE.BoxGeometry(width, height, depth);

        const frontMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Depth
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
        this.handIndex = 0;
        this.gameObject = new THREE.Mesh(geometry, materials);
        this.position = this.gameObject.position;
        this.duel.core.scene.add(this.gameObject);
        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
        this.isActive = false;
    }

    onMouseClick?(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        this.duel.events.publish("set-selected-card", {
            player: this.card.owner,
            card: this.card
        });

        const action = this.duel.actionManager.getAction<ActionCardHandMenu>("card-hand-menu");
        action.setData({
            duel: this.duel,
            card: this.card,
            cardInHand: this,
            index: this.handIndex,
            mouseEvent: event
        })
        this.duel.actionManager.setAction(action);
    }

    onMouseEnter?(event: MouseEvent): void {
        this.gameObject.position.copy(this.position);
        this.gameObject.position.y += 0.3;
    }

    onMouseLeave?(event: MouseEvent): void {
        if (this.isActive) return;
        this.gameObject.position.copy(this.position);
    }

    setCard(card: Card) {
        if (this.card && card && this.card.id === card.id) {
            this.card = card;
            return;
        }

        const prevCard = this.card;
        this.card = card;

        if (prevCard && prevCard.id === this.card.id) return;

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
    }

    setActive(status: boolean) {
        if (status) {
            this.isActive = status;
            this.gameObject.position.copy(this.position)
            this.gameObject.position.y += 0.3;
        } else {
            this.isActive = status;
            this.gameObject.position.copy(this.position);
        }
    }

    destroy() {
        this.duel.destroy(this);
    }
}