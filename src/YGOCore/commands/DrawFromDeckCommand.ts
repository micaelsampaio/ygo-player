import { BaseCommand } from './BaseCommand';
import { DrawFromDeckCommandData } from '../types/commands';
import { Card } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class DrawFromDeckCommand extends BaseCommand {
    public baseType: string = "DrawFromDeckCommand";
    private data: DrawFromDeckCommandData;
    private cards: Card[];

    constructor(data: DrawFromDeckCommandData) {
        super();

        this.type = "Draw From Deck";
        this.data = data;
        this.data.numberOfCards = this.data.numberOfCards || 1;
        this.cards = [];
    }

    exec(): void {
        console.log(`Exec: Draw ${this.data.numberOfCards} from Deck`);

        this.cards = [];

        const field = this.YGO.state.fields[this.data.player];

        for (let i = 0; i < this.data.numberOfCards!; ++i) {
            const card = field.mainDeck.pop()!;
            console.log("DRAW", card.name);

            field.hand.push(card);
            this.cards.push(card);

            const originZone = YGOGameUtils.createZone("D", this.data.player, field.mainDeck.length - 1);
            const zone = YGOGameUtils.createZone("H", this.data.player, field.hand.length);

            this.YGO.duelLog.dispatch<YGODuelEvents.DrawFromDeck>({
                commandId: this.getCommandId(),
                player: this.data.player,
                type: YGODuelEvents.LogType.DrawCardFromDeck,
                id: card.id,
                originZone,
                zone,
            });
        }
    }

    undo(): void {
        console.log(`Undo: Draw ${this.data.numberOfCards} from Deck`);

        const newCards = [...this.cards].reverse();
        const field = this.YGO.state.fields[this.data.player];

        console.log("CARD DRAW UNDO");
        console.log(newCards.map(c => c.name));
        console.log("DECK 1>>", field.mainDeck.length);
        for (const card of newCards) {
            const cardInHandIndex = field.hand.findIndex(c => c === card);
            if (cardInHandIndex !== -1) {
                field.hand.splice(cardInHandIndex, 1);
            }
        }
        field.mainDeck.push(...newCards);

        console.log(field.hand.map(c => c.name));
        console.log("DECK 2>>", field.mainDeck.length);
    }
}
