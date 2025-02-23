import { BaseCommand } from './BaseCommand';
import { Command, SetMonsterCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';

export class SetMonsterCommand extends BaseCommand {
    public baseType: string = "SetMonsterCommand";
    private data: SetMonsterCommandData;
    private moveCardCommand: Command;

    constructor(data: SetMonsterCommandData) {
        super();
        this.type = "Set Monster";
        this.data = data;
        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: "facedown"
        });
    }

    exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}