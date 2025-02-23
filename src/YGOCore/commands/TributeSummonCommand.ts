import { BaseCommand } from './BaseCommand';
import { Command, TributeSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { SendCardToGYCommand } from './SendCardToGY';

export class TributeSummonCommand extends BaseCommand {
    public baseType: string = "TributeSummonCommand";
    private data: TributeSummonCommandData;
    private commands: Command[];
    
    constructor(data: TributeSummonCommandData) {
        super();
        this.type = "Tribute Summon";
        this.data = data;
        this.data.position = this.data.position || "faceup-attack";
        this.commands = [];

        this.data.tributes.forEach(card => {
            this.commands.push(new SendCardToGYCommand({
                id: card.id,
                originZone: card.zone,
                player: this.data.player
            }))
        });

        this.commands.push(new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position
        }));
    }

    exec(): void {
        this.commands.forEach(cmd => this.execChildCommand(cmd));
    }

    undo(): void {
        this.commands.forEach(cmd => this.undoChildCommand(cmd));
    }
}
