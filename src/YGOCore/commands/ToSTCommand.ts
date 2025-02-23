import { BaseCommand } from './BaseCommand';
import { Command, ToSTCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';

export class ToSTCommand extends BaseCommand {
    public baseType: string = "ToSTCommand";
    private data: ToSTCommandData;
    private moveCardCommand: Command;

    constructor(data: ToSTCommandData) {
        super();
        this.type = "To ST";
        this.data = data;

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: "faceup"
        });
    }

    exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}