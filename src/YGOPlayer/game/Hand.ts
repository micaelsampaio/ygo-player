import { Card } from "../../YGOCore/types/types";
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import { GameCardHand } from './GameCardHand';
import * as THREE from 'three';

export class GameHand extends YGOEntity {

    private duel: YGODuel;
    public canHoverHand: boolean = true;
    public canClickHand: boolean = true;

    public cards: GameCardHand[];

    public selectedCard: GameCardHand | undefined;
    private player: number;

    constructor(duel: YGODuel, player: number) {
        super();
        this.duel = duel;
        this.player = player;
        this.cards = [];
        this.selectedCard = undefined;
    }

    public disableHand() {

    }

    public enableHand() {

    }


    public onCardHover() {

    }

    getCard(index: number): GameCardHand {
        return this.cards[index];
    }

    getCardFromReference(card: Card): GameCardHand {
        return this.cards.find(c => c.card === card)!;
    }

    removeCardFromCardReference(card: Card) {
        const index = this.cards.findIndex(c => c.card === card);

        if (index >= 0) {
            this.cards[index].destroy();
            this.cards = this.cards.filter((_, i) => i !== index);
            this.cards.forEach((c, index) => c.handIndex = index);
        }
    }

    render() {
        const gameField = this.duel.fields[this.player];
        const cardWidth = 3;
        const cardSpacing = 2.2;
        const totalCards = gameField.hand.cards.length;

        const handWidth = (totalCards - 1) * cardSpacing + cardWidth;
        const handY = 7.5 * (this.player === 0 ? -1 : 1);
        const handZ = 3.5;

        const camera = this.duel.camera;
        const cameraPosition = camera.position.clone();

        const screenHeight = document.querySelector("canvas")!.height;
        console.log("HEIGHT", screenHeight)
        const heightInWorldUnits = 0.1 * screenHeight * ((camera as any).fov * Math.PI / 180) / Math.tan((camera as any).fov * Math.PI / 180 / 2);
            

        for (let i = 0; i < totalCards; ++i) {
            // Calculate xOffset for each card
            const xOffset = -handWidth / 2 + cardWidth / 2 + i * cardSpacing;

            const handCard = gameField.hand.getCard(i)!;

            handCard.gameObject.position.set(xOffset, handY, handZ);

            handCard.position = handCard.gameObject.position.clone();

            handCard.gameObject.rotation.set(0, 0, 0);

            handCard.gameObject.visible = true;
        }
    }

}   