import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { GameCard } from './GameCard';
import { Card, FieldZone } from '../../YGOCore/types/types';
import { ActionCardZoneMenu } from '../actions/ActionCardZoneMenu';
import { getCardRotation } from '../scripts/ygo-utils';

export class CardZone extends YGOEntity implements YGOUiElement {

    public isUiElement: boolean = true;
    public isUiElementClick: boolean = true;

    private duel: YGODuel;
    public zone: FieldZone;
    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public player: number;
    private mesh: THREE.Mesh;
    private normalMaterial: THREE.MeshBasicMaterial;
    private hoverMaterial: THREE.MeshBasicMaterial;
    private card: GameCard | null;
    public onClickCb: ((cardZone: CardZone) => void) | null;

    constructor({ duel, player, position, rotation, zone }: { duel: YGODuel, player: number, zone: FieldZone, position: THREE.Vector3, rotation: THREE.Euler }) {
        super();
        this.duel = duel;
        this.zone = zone;
        this.position = position;
        this.rotation = rotation;
        this.player = player;
        this.card = null;

        const geometry = new THREE.BoxGeometry(2.8, 2.8, 0.05);

        this.normalMaterial = new THREE.MeshBasicMaterial({ color: zone.startsWith("M") ? 0x00ff00 : 0x0000ff });
        this.hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const cube = new THREE.Mesh(geometry, this.normalMaterial);
        cube.position.copy(this.position);
        cube.position.z += 0.05;
        cube.rotation.copy(this.rotation);

        this.duel.core.scene.add(cube);
        this.gameObject = cube;
        this.mesh = cube;

        this.position = cube.position.clone();
        this.position.z += 0.1;
        this.onClickCb = null;

        this.duel.gameController.getComponent<YGOMouseEvents>("mouse_events")?.registerElement(this);
    }

    onMouseClick(event: MouseEvent): void {
        this.duel.events.publish("set-selected-card", {
            player: 0,
            card: this.getCardReference()
        });

        if (!this.onClickCb) {
            event.preventDefault();
            event.stopPropagation();

            if (this.getCardReference()) {
                const action = this.duel.actionManager.getAction<ActionCardZoneMenu>("card-zone-menu");
                action.setData({
                    duel: this.duel,
                    card: this.card!.cardReference,
                    zone: this.zone,
                    mouseEvent: event
                })
                this.duel.actionManager.setAction(action);
            } else {
                this.duel.events.publish("clear-ui-action");
            }

        }

        if (this.onClickCb) {
            this.onClickCb(this);
        }
    }

    onMouseEnter(event: MouseEvent): void {
        this.mesh.material = this.hoverMaterial;
    }

    onMouseLeave(event: MouseEvent): void {
        this.mesh.material = this.normalMaterial;
    }

    setCard(card: Card | null) {
        if (!card) {
            this.destroyCard();
            return;
        }

        if (card === this.getCardReference()) return;

        if (this.card) this.card.destroy();

        this.card = new GameCard({ duel: this.duel, card });
    }

    setGameCard(card: GameCard | null) {
        if (card === this.card) return;

        if (!card) {
            this.destroyCard();
            return;
        }

        this.card = card;
    }

    getGameCard(): GameCard | null {
        return this.card;
    }

    getCardReference(): Card | null {
        return this.card?.cardReference || null;
    }

    removeCard() {
        if (this.card) {
            this.card = null;
        }
    }

    destroyCard() {
        if (this.card) {
            this.card.destroy();
            this.card = null;
        }
    }

    updateCard() {
        if (!this.card) return;

        const card = this.getCardReference();

        if (!card) return;

        const rotation = getCardRotation(this.getCardReference()!, this.zone);
        this.card.gameObject.position.copy(this.position);
        this.card.gameObject.rotation.copy(rotation);

        this.card.updateCardStats();
    }

    isEmpty() {
        return !this.card;
    }

    hasCard() {
        return !!this.card;
    }
}