import { BaseCommand } from './BaseCommand';
import { Command, ToHandCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { YGOCore } from '../game/YGOCore';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class ToHandCommand extends BaseCommand {
    public baseType: string = "ToHandCommand";
    private data: ToHandCommandData;
    private command!: Command;

    constructor(data: ToHandCommandData) {
        super();
        this.type = "To Hand";
        this.data = data;
    }

    override init(ygo: YGOCore): void {
        super.init(ygo);

        const handIndex = this.YGO.getField(this.data.player).hand.length + 1;

        this.command = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: YGOGameUtils.createZone("H", this.data.player, handIndex),
            position: "facedown"
        });
    }

    override exec(): void {
        this.execChildCommand(this.command);
    }

    override undo(): void {
        this.undoChildCommand(this.command);
    }
}