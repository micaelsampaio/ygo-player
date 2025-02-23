import { BaseCommand } from './BaseCommand';
import { Command, ToDeckCommandData } from '../types/commands';
import { FieldZone } from '../types/types';
import { MoveCardCommand } from './MoveCardCommand';
import { ShuffleDeckCommand } from './ShuffleDeck';
import { YGOCore } from '../game/YGOCore';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class ToDeckCommand extends BaseCommand {
    public baseType: string = "ToDeckCommand";
    private data: ToDeckCommandData;
    private zone!: FieldZone;
    private commands!: Command[];

    constructor(data: ToDeckCommandData) {
        super();
        this.data = data;
        this.type = this.getCommandType();
    }

    private isTopCard() {
        return this.data.position === "top";
    }

    private getCommandType() {
        return this.isTopCard() ? "To Top Deck" : "To Bottom Deck";
    }

    private getDeckIndex(): number {
        const mainDeck = this.YGO.state.fields[this.data.player].mainDeck;

        if (this.isTopCard()) {
            return mainDeck.length + 1;
        }

        return 1;
    }

    override init(ygo: YGOCore): void {
        super.init(ygo);

        if (!this.commands) {
            const { player, shuffle = false } = this.data;

            const deckIndex = this.getDeckIndex();
            this.zone = YGOGameUtils.createZone("D", player, deckIndex);
            this.commands = [];
            this.commands.push(new MoveCardCommand({
                player: this.data.player,
                type: this.type,
                id: this.data.id,
                originZone: this.data.originZone,
                zone: this.zone,
            }));

            if (shuffle) {
                this.commands.push(new ShuffleDeckCommand({ player: this.data.player }));
            }
        }
    }

    exec(): void {
        this.execMultipleChildCommand(this.commands);
    }

    undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}