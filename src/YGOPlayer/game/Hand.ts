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

    // override update(dt: number): void {
    //     const gameField = this.duel.state.fields[0];

    //     if (!gameField || !gameField.hand) return;

    //     const handCardsWidth = gameField.hand.length * 3 - 1.5;

    //     for (let i = 0; i < gameField.hand.length; ++i) {
    //         const x = i * 3;
    //         const pos = gameField.hand[i].gameObject!.position.clone();
    //         pos.x = (-handCardsWidth / 2) + x;
    //         gameField.hand[i].gameObject!.position.lerp(pos, 0.05);
    //     }

    // }

    public disableHand() {

    }

    public enableHand() {

    }

    public updateHand() {

    }

    public onCardHover() {

    }

    public onCardClick(card: Card) {
        // TODO CREATE EVENTS
    }
}   