import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { ActionUiMenu } from '../actions/ActionUiMenu';
import { GameBackCard } from './GameBackCard';

export class Deck extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    private duel: YGODuel;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private mesh: THREE.Mesh;
    private action: ActionUiMenu;
    public player: number;
    private cards: GameBackCard[];

    constructor({ duel, player, position }: { duel: YGODuel, player: number, zone: string, position: THREE.Vector3 }) {
        super();
        this.duel = duel;
        this.player = player;
        this.action = new ActionUiMenu(duel, { eventType: "deck-menu" });

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: 0x00555 });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const geometry = new THREE.BoxGeometry(2, 2, 0.1);
        const cube = new THREE.Mesh(geometry, this.normalMaterial);
        cube.position.copy(position);

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);

        this.cards = Array.from(new Array(60)).map((_, index) => {
            const card = new GameBackCard({ duel: this.duel });
            card.gameObject.position.set(cube.position.x, cube.position.y, cube.position.z + index * 0.02);
            card.gameObject.rotation.set(0, THREE.MathUtils.degToRad(180), THREE.MathUtils.degToRad(-15));
            if (player === 1) {
                card.gameObject.rotateZ(THREE.MathUtils.degToRad(180));
            }
            return card;
        });
    }

    getCardTransform(): THREE.Object3D {
        for (let i = this.cards.length - 1; i >= 0; --i) {
            if (this.cards[i].gameObject.visible) {
                return this.cards[i].gameObject;
            }
        }

        return this.gameObject;
    }

    updateDeck() {
        const deckSize = this.duel.ygo.getField(this.player).mainDeck.length;
        for (let i = 0; i < this.cards.length; ++i) {
            this.cards[i].gameObject.visible = i <= deckSize;
        }
    }

    onMouseClick(event: MouseEvent): void {
        this.action.eventData = { duel: this.duel, deck: this, mouseEvent: event };
        this.duel.actionManager.setAction(this.action);
    }

    onMouseEnter(): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(): void {
        this.mesh.material = this.normalMaterial;
    }
}