import { BaseCommand } from './BaseCommand';
import { ShuffleDeckCommandData } from '../types/commands';
import { YGODuelEvents } from '../types/duel-events';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class ShuffleDeckCommand extends BaseCommand {
    public baseType: string = "ShuffleDeckCommand";
    private data: ShuffleDeckCommandData;
    private cardPositions!: Array<number>;

    constructor(data: ShuffleDeckCommandData) {
        super();
        this.data = data;
        this.type = "Shuffle Deck";
    }

    exec(): void {
        console.log("--------------------\n\nSHUFFLE DECK \n\n------------------------");
        const mainDeck = this.YGO.state.fields[this.data.player].mainDeck;

        if (this.cardPositions) {
            for (let i = 0; i < this.cardPositions.length; ++i) {
                const index = this.cardPositions[i];
                const temp = mainDeck[index];
                mainDeck[index] = mainDeck[i];
                mainDeck[i] = temp;
            }
        } else {
            this.cardPositions = YGOGameUtils.shuffleCards(mainDeck);
        }

        if (this.data.log !== false) {
            this.YGO.duelLog.dispatch<YGODuelEvents.Shuffle>({
                player: this.data.player,
                commandId: this.getCommandId(),
                type: YGODuelEvents.LogType.Shuffle
            });
        }
    }

    undo(): void {
        const mainDeck = this.YGO.state.fields[this.data.player].mainDeck;
        for (let i = 0; i < this.cardPositions.length; ++i) {
            const index = this.cardPositions[i];
            const temp = mainDeck[index];
            mainDeck[index] = mainDeck[i];
            mainDeck[i] = temp;
        }
    }
}
