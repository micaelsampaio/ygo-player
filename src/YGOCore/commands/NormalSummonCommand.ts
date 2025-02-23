import { BaseCommand } from './BaseCommand';
import { Command, NormalSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';

export class NormalSummonCommand extends BaseCommand {
    public baseType: string = "NormalSummonCommand";
    private data: NormalSummonCommandData;
    private moveCardCommand: Command;

    constructor(data: NormalSummonCommandData) {
        super();
        this.type = "Normal Summon";
        this.data = data;
        this.data.position = "faceup-attack";

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position
        });
    }

    override exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    override undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}