import { BaseCommand } from './BaseCommand';
import { Command, SpecialSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';

export class SpecialSummonCommand extends BaseCommand {
    public baseType: string = "SpecialSummonCommand";
    private data: SpecialSummonCommandData;
    private moveCardCommand: Command;

    constructor(data: SpecialSummonCommandData) {
        super();
        this.type = "Special Summon";
        this.data = data;
        this.data.position = this.data.position || 'faceup-attack';

        if (this.data.position !== 'faceup-attack'
            && this.data.position !== 'faceup-defense') {
            this.data.position = 'faceup-attack';
        }

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: "Special Summon",
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position
        });
    }

    exec(): void {
        this.execChildCommand(this.moveCardCommand);
    }

    undo(): void {
        this.undoChildCommand(this.moveCardCommand);
    }
}