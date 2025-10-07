import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { ActionUiMenu } from '../actions/ActionUiMenu';
import { GameBackCard } from './GameBackCard';
import { CARD_HEIGHT_SIZE, CARD_RATIO } from '../constants';
import { YGOStatic } from '../core/YGOStatic';

export class Deck extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    private action: ActionUiMenu;
    public player: number;
    private cards: GameBackCard[];
    private hoverGameObject: THREE.Mesh;
    public canInteract: boolean;

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;
        this.action = new ActionUiMenu(duel, { eventType: "deck-menu" });

        const material = new THREE.MeshBasicMaterial({ color: 0x00555, transparent: true, opacity: 0 });
        const hoverMaterial = new THREE.MeshBasicMaterial({ color: YGOStatic.isPlayerPOV(player) ? 0x0000ff : 0xff0000, transparent: true, opacity: 0.55 });

        const geometry = new THREE.BoxGeometry(4, 4, 0.1);
        const cube = new THREE.Mesh(geometry, material);
        this.gameObject = cube;
        cube.position.copy(position);

        const cardSize = CARD_HEIGHT_SIZE * 1.3;
        const hoverGeometry = new THREE.PlaneGeometry(cardSize / CARD_RATIO * 1.2, cardSize);
        this.hoverGameObject = new THREE.Mesh(hoverGeometry, hoverMaterial);

        this.hoverGameObject.position.set(0, 0, 0.1);
        this.hoverGameObject.rotation.set(0, 0, THREE.MathUtils.degToRad(15));

        this.duel.core.scene.add(cube);
        this.gameObject.add(this.hoverGameObject);

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
        this.canInteract = true;

        this.cards = Array.from(new Array(60)).map((_, index) => {
            const card = new GameBackCard({ duel: this.duel });
            card.gameObject.position.set(cube.position.x, cube.position.y, cube.position.z + index * 0.02);
            card.gameObject.rotation.set(0, THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(-15));
            if (!YGOStatic.isPlayerPOV(player)) {
                card.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
            }
            return card;
        });

        this.hoverGameObject.visible = false;
    }

    getCardTransform(): THREE.Object3D {
        for (let i = this.cards.length - 1; i >= 0; --i) {
            if (this.cards[i].gameObject.visible) {
                return this.cards[i].gameObject;
            }
        }

        return this.gameObject;
    }

    updateDeck(size?: number) {
        const deckSize = size || this.duel.ygo.getField(this.player).mainDeck.length;
        for (let i = 0; i < this.cards.length; ++i) {
            this.cards[i].gameObject.visible = i < deckSize;
        }
    }

    getDeckSize() {
        for (let i = this.cards.length - 1; i >= 0; --i) {
            if (this.cards[i].gameObject.visible) {
                return i + 1;
            }
        }
        return 0;
    }

    onMouseClick(event: MouseEvent): void {
        if (!this.canInteract) return;
        if (this.duel.config.autoChangePlayer) {
            this.duel.setActivePlayer(this.player);
        }

        this.action.eventData = { duel: this.duel, deck: this, mouseEvent: event };
        this.duel.actionManager.setAction(this.action);
    }

    onMouseEnter(): void {
        if (!this.canInteract) return;
        this.hoverGameObject.visible = true;
    }

    onMouseLeave(): void {
        if (!this.canInteract) return;
        this.hoverGameObject.visible = false;
    }
}