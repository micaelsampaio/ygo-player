import { BaseCommand } from './BaseCommand';
import { Command, MillFromDeckCommandData } from '../types/commands';
import { SendCardToGYCommand } from './SendCardToGY';
import { YGOCore } from '../game/YGOCore';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class MillFromDeckCommand extends BaseCommand {
    public baseType: string = "MillFromDeckCommand";
    private data: MillFromDeckCommandData;
    private commands: Command[];

    constructor(data: MillFromDeckCommandData) {
        super();

        this.type = "Mill From Deck";
        const { numberOfCards = 1 } = data;
        this.data = data;
        this.data.numberOfCards = Math.max(1, numberOfCards);
        this.commands = [];
    }

    override init(ygo: YGOCore): void {
        super.init(ygo);

        const field = this.YGO.getField(this.data.player);
        const numberOfCards = Math.min(this.data.numberOfCards!, field.mainDeck.length);

        for (let i = 0; i < numberOfCards!; ++i) {
            const cardIndex = field.mainDeck.length - 1 - i;
            const card = field.mainDeck[cardIndex];

            // TODO LOG THIS SHIT :)

            this.commands.push(new SendCardToGYCommand({
                id: card.id,
                originZone: YGOGameUtils.createZone("D", this.data.player, cardIndex + 1),
                player: this.data.player
            }))
        }
    }

    exec(): void {
        this.execMultipleChildCommand(this.commands);
    }

    undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}
