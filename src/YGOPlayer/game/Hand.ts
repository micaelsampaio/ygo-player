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

    getCardFromCardId(id: number): GameCardHand {
        return this.cards.find(c => c.card.id === id)!;
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
        const camera = this.duel.camera;

        const cardWidth = 3;
        const cardSpacing = 2.2;
        const totalCards = gameField.hand.cards.length;
        const handWidth = (totalCards - 1) * cardSpacing + cardWidth;

        const fov = (camera as any).fov * Math.PI / 180;
        const distance = camera.position.z;

        const handZ = 7;
        const visibleHeightAtZ = 2 * Math.tan(fov / 2) * Math.abs(distance - handZ);

        const screenEdgeOffset = 0.15;//untis from bottom of the screen
        const handY = (this.player === 0)
            ? -visibleHeightAtZ / 2 + screenEdgeOffset
            : visibleHeightAtZ / 2 - screenEdgeOffset;

        for (let i = 0; i < totalCards; ++i) {
            const xOffset = -handWidth / 2 + cardWidth / 2 + i * cardSpacing;
            const handCard = gameField.hand.getCard(i)!;

            handCard.gameObject.position.set(xOffset, handY, handZ);
            handCard.position = handCard.gameObject.position.clone();

            if (handCard.card.originalOwner === 0) {
                handCard.gameObject.rotation.set(0, 0, 0);
            } else {
                handCard.gameObject.rotation.set(0, 0, THREE.MathUtils.degToRad(180));
            }

            handCard.gameObject.visible = true;
        }
    }

}   