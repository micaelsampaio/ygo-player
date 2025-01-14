import * as THREE from 'three';
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from "../core/YGOEntity";
import { YGOUiElement } from "../types";
import { YGOMouseEvents } from '../core/components/YGOMouseEvents';
import { GameCard } from './GameCard';
import { Card, FieldZone } from '../../YGOCore/types/types';
import { YGOMath } from '../core/YGOMath';
import { ActionCardZoneMenu } from '../actions/ActionCardZoneMenu';
import { YGOGameUtils } from '../../YGOCore';

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
        // TODO
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
        console.log("CLICK ZONE", this.zone);

        console.log("CARD: ", this.card?.cardReference.name);

        if (!this.onClickCb && this.card?.cardReference) {
            event.preventDefault();
            event.stopPropagation();

            console.log("MOUSE CLICK CARD");
            //duel, card, index, clearAction, mouseEvent
            const action = this.duel.actionManager.getAction<ActionCardZoneMenu>("card-zone-menu");
            action.setData({
                duel: this.duel,
                card: this.card.cardReference,
                zone: this.zone,
                mouseEvent: event
            })
            this.duel.actionManager.setAction(action);
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
        //this.card = card;
        if (!card) {
            this.destroyCard();
            return;
        }

        // TODO CREATE GAME CARD
        this.card = new GameCard({ duel: this.duel, card });
        this.updateCard();
    }

    setGameCard(card: GameCard | null) {
        if (!card) {
            this.destroyCard();
            return;
        }

        this.card = card;
        this.updateCard();
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

        // ROTATION ETC 

        // TODO CARD POSITION YARA YARA
        // TODO UPDATE POSITION ROTATION YARE YARE
    }

    // getCardPositionAndRotation(card: Card) {
    //     if (this.isMonsterZone) {
    //         if (YGOGameUtils.isFaceDown(card)) {
    //             const rotation = this.rotation.clone();
    //             rotation.y += YGOMath.degToRad(180);
    //             rotation.z += YGOMath.degToRad(-90);
    //             return {
    //                 position: this.position,
    //                 rotation,
    //                 scale: 1
    //             }
    //         } else if (card.position === "faceup-defense") {
    //             const rotation = this.rotation.clone();
    //             rotation.z += YGOMath.degToRad(90);

    //             return {
    //                 position: this.position,
    //                 rotation,
    //                 scale: 1
    //             }
    //         } else {
    //             return {
    //                 position: this.position,
    //                 rotation: this.rotation,
    //                 scale: 1
    //             }
    //         }
    //     } else {
    //         if (YGOGameUtils.isFaceDown(card)) {
    //             const rotation = this.rotation.clone();
    //             rotation.y += YGOMath.degToRad(180);
    //             return {
    //                 position: this.position,
    //                 rotation,
    //                 scale: 1
    //             }
    //         } else {
    //             return {
    //                 position: this.position,
    //                 rotation: this.rotation,
    //                 scale: 1
    //             }
    //         }
    //     }
    // }

    // reconcileCardWithState(card: Card | null) {
    //     if (!card && this.card) {
    //         // remove card
    //         this.card.destroy();
    //         this.setCard(null);
    //     } else if (card && !this.card) {
    //         // create card
    //         const gameCard = new GameCard({
    //             duel: this.duel,
    //             card
    //         });
    //         this.setCard(gameCard);
    //     } else if (card && this.card && this.card.cardReference !== card) {
    //         this.card.setCard(card);
    //     }

    //     if (this.card) {
    //         const { position, rotation, scale } = this.getCardPositionAndRotation(this.card.cardReference);
    //         this.card.gameObject.position.copy(position);
    //         this.card.gameObject.rotation.copy(rotation);
    //         this.card.gameObject.scale.set(scale, scale, scale);
    //     }
    // }

    isEmpty() {
        return !this.card;
    }

    hasCard() {
        return !!this.card;
    }
}