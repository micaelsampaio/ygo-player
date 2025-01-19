import { Card } from "../../YGOCore/types/types";
import { YGODuel } from "../core/YGODuel";
import { YGOEntity } from '../core/YGOEntity';
import { GameCardHand } from './GameCardHand';

export class GameHand extends YGOEntity {

    private duel: YGODuel;

    public canHoverHand: boolean = true;
    public canClickHand: boolean = true;

    public cards: GameCardHand[];

    constructor(duel: YGODuel, player: number) {
        super();

        this.duel = duel;
        this.cards = [];
    }

    public disableHand() {

    }

    public enableHand() {

    }

    public updateHand() {

    }

    public onCardHover() {

    }

    getCard(index: number): GameCardHand | null {
        return this.cards[index];
    }
    
    getCardFromReference(card: Card): GameCardHand | null {
        return this.cards.find(c => c.card === card) || null;
    }

    removeCardFromCardReference(card: Card) {
        const index = this.cards.findIndex(c => c.card === card);

        if (index > 0) {
            this.cards[index].destroy();
            this.cards = this.cards.filter((_, i) => i !== index);
        }
    }

    public onCardClick(card: Card) {
        // TODO CREATE EVENTS
    }
}   