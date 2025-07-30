import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { GameBackCard } from './GameBackCard';
import { CARD_HEIGHT_SIZE, CARD_RATIO } from '../constants';
import { GameCard } from './GameCard';
import { Card } from 'ygo-core';

export class ExtraDeck extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    private player: number;
    public position: THREE.Vector3;
    public faceDownRotation: THREE.Euler;
    private hoverGameObject: THREE.Mesh;
    private cards: GameBackCard[];
    public faceUpCards: GameCard[];
    public isMenuVisible: boolean;

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;
        this.isMenuVisible = false;

        const material = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        const hoverMaterial = new THREE.MeshBasicMaterial({ color: player === 0 ? 0x0000ff : 0xff0000, transparent: true, opacity: 0.55 });

        const geometry = new THREE.BoxGeometry(4, 4, 0.1);
        const cube = new THREE.Mesh(geometry, material);
        this.gameObject = cube;
        cube.position.copy(position);

        const cardSize = CARD_HEIGHT_SIZE * 1.3;
        const hoverGeometry = new THREE.PlaneGeometry(cardSize / CARD_RATIO * 1.2, cardSize);
        this.hoverGameObject = new THREE.Mesh(hoverGeometry, hoverMaterial);
        this.hoverGameObject.position.set(0, 0, 0.1);
        this.hoverGameObject.rotation.set(0, 0, THREE.MathUtils.degToRad(-15));

        this.position = position.clone();
        cube.position.copy(this.position);

        this.faceDownRotation = cube.rotation.clone();
        this.faceDownRotation.y += THREE.MathUtils.degToRad(180);

        this.duel.core.scene.add(cube);
        this.gameObject.add(this.hoverGameObject);

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);

        this.cards = Array.from(new Array(60)).map((_, index) => {
            const card = new GameBackCard({ duel: this.duel });
            card.gameObject.position.set(this.gameObject.position.x, this.gameObject.position.y, this.gameObject.position.z + index * 0.02);
            card.gameObject.rotation.set(0, THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(15));
            if (this.player === 1) {
                card.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
            }
            return card;
        });

        this.faceUpCards = [];
        this.hoverGameObject.visible = false;
    }

    getCardTransform(): THREE.Object3D {
        if (this.faceUpCards.length > 0) {
            return this.faceUpCards[this.faceUpCards.length - 1].gameObject;
        }

        for (let i = this.cards.length - 1; i >= 0; --i) {
            if (this.cards[i].gameObject.visible) {
                return this.cards[i].gameObject;
            }
        }

        return this.gameObject;
    }

    updateExtraDeck() {
        const deckSize = this.duel.ygo.getField(this.player).extraDeck.length;

        for (let i = 0; i < this.cards.length; ++i) {
            this.cards[i].gameObject.visible = i < deckSize;
        }

        for (let i = 0; i < this.faceUpCards.length; ++i) {
            const card = this.faceUpCards[i];
            const index = deckSize + i + 1;
            card.gameObject.position.set(this.gameObject.position.x, this.gameObject.position.y, this.gameObject.position.z + index * 0.02);
            card.gameObject.rotation.set(0, 0, THREE.MathUtils.degToRad(-15));
            if (this.player === 1) {
                card.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
            }
        }
    }

    getGameCard(card: Card): GameCard {
        for (let i = 0; i < this.faceUpCards.length; ++i) {
            if (card === this.faceUpCards[i].cardReference) {
                return this.faceUpCards[i]
            }
        }
        return null!;
    }

    destroyGameCard(card: Card) {
        this.faceUpCards = this.faceUpCards.filter(c => {
            if (c.cardReference === card) {
                c.destroy();
                return false;
            }
            return true;
        })
    }

    onMouseClick(event: MouseEvent): void {
        if (this.duel.config.autoChangePlayer) {
            this.duel.setActivePlayer(this.player);
        }

        const eventName = this.isMenuVisible ? "close-ui-menu" : "set-ui-menu";
        this.duel.events.dispatch(eventName, { group: "game-overlay", type: "extra-deck", data: { player: this.player, extraDeck: this } })
    }

    onMouseEnter(): void {
        this.hoverGameObject.visible = true;
    }

    onMouseLeave(): void {
        this.hoverGameObject.visible = false;
    }
}