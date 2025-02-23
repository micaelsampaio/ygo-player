import { BaseCommand } from './BaseCommand';
import { Command, DestroyCardCommandData } from '../types/commands';
import { FieldZone } from '../types/types';
import { MoveCardCommand } from './MoveCardCommand';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class DestroyCardCommand extends BaseCommand {
    public baseType: string = "DestroyCardCommand";
    private data: DestroyCardCommandData;
    private zone: FieldZone;
    private moveCardCommand: Command;

    constructor(data: DestroyCardCommandData) {
        super();

        this.type = "Destroy";
        this.data = data;
        this.zone = data.zone || YGOGameUtils.createZone("GY", this.data.player, 1);

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.zone
        });
    }

    exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}