import { BaseCommand } from './BaseCommand';
import { StartHandCommandData } from '../types/commands';
import { Card, FieldZone } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class StartHandCommand extends BaseCommand {
    public baseType: string = "StartHandCommand";
    private data: StartHandCommandData;
    private cards: Card[];

    constructor(data: StartHandCommandData) {
        super();
        this.type = "Start Hand";
        this.data = data;
        this.cards = [];
        (this as any).core = true;
    }

    exec(): void {
        const field = this.YGO.getField(this.data.player);

        if (this.cards.length > 0) {
            for (let i = 0; i < this.cards.length; ++i) {
                const card = field.mainDeck.shift();
                if (card) {
                    field.hand.push(card);
                }
            }
        } else if (field.hand.length > 0) {
            this.cards = [...field.hand];
        } else {
            this.cards = [];
            const numCardsToDraw = Math.min(this.data.numberOfCards, field.mainDeck.length);

            for (let i = 0; i < numCardsToDraw; ++i) {
                const card = field.mainDeck.shift();
                if (card) {
                    field.hand.push(card);
                    this.cards.push(card);
                }
            }
        }

        const cards: { id: number, zone: FieldZone }[] = this.cards.map((card, handIndex) => {
            return {
                id: card.id,
                zone: YGOGameUtils.createZone("H", this.data.player, handIndex + 1)
            };
        });

        this.YGO.duelLog.dispatch<YGODuelEvents.StartHand>({
            commandId: this.getCommandId(),
            player: this.data.player,
            type: YGODuelEvents.LogType.StartHand,
            cards,
            core: true,
        });
    }

    undo(): void {
        const field = this.YGO.state.fields[this.data.player];
        field.hand = [];
        field.mainDeck.unshift(...this.cards);
    }
}
