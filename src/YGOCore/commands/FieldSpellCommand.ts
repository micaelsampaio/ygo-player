import { BaseCommand } from './BaseCommand';
import { Command, FieldSpellCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { RevealCommand } from './RevealCommand';
import { SendCardToGYCommand } from './SendCardToGY';
import { YGOGameUtils } from '../game/YGOGameUtils';
import { YGOCore } from '../game/YGOCore';

export class FieldSpellCommand extends BaseCommand {
    public baseType: string = "FieldSpellCommand";
    private data: FieldSpellCommandData;
    private commands: Command[];

    constructor(data: FieldSpellCommandData) {
        super();

        this.type = "Field Spell";
        this.data = data;
        this.data.position = data.position === "facedown" ? "facedown" : "faceup";
        this.commands = [];
    }

    init(ygo: YGOCore): void {
        super.init(ygo);

        const fieldCard = this.YGO.getField(this.data.player).fieldZone;

        if (fieldCard) {
            this.commands.splice(0, 1, new SendCardToGYCommand({
                player: this.data.player,
                id: fieldCard.id,
                originZone: YGOGameUtils.createZone("F", this.data.player)
            }));
        }

        this.commands.push(new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position
        }));

        if (this.data.reveal) {
            this.commands.push(new RevealCommand({
                id: this.data.id,
                originZone: this.data.zone,
                player: this.data.player
            }));
        }
    }

    override exec(): void {
        this.execMultipleChildCommand(this.commands);
    }

    override undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}