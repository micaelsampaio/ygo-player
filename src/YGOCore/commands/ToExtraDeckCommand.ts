import { BaseCommand } from './BaseCommand';
import { Command, ToExtraDeckCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class ToExtraDeckCommand extends BaseCommand {
    public baseType: string = "ToExtraDeckCommand";
    private data: ToExtraDeckCommandData;
    private moveCardCommand: Command;

    constructor(data: ToExtraDeckCommandData) {
        super();
        this.type = "To Extra Deck";
        this.data = data;

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: YGOGameUtils.createZone("ED", this.data.player)
        });
    }

    override exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    override undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}