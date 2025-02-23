import { BaseCommand } from './BaseCommand';
import { Command, SendCardToGYCommandData } from '../types/commands';
import { FieldZone } from '../types/types';
import { MoveCardCommand } from './MoveCardCommand';
import { YGOGameUtils } from '../game/YGOGameUtils';
import { YGOCore } from '../game/YGOCore';

export class SendCardToGYCommand extends BaseCommand {
    public baseType: string = "SendCardToGYCommand";
    private data: SendCardToGYCommandData;
    private zone!: FieldZone;
    private moveCardCommand!: Command;

    constructor(data: SendCardToGYCommandData) {
        super();

        this.type = "Send To GY";
        this.data = data;
    }
    init(ygo: YGOCore): void {
        super.init(ygo);

        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        this.zone = this.data.zone || YGOGameUtils.createZone("GY", card.originalOwner, 1);

        this.moveCardCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            reason: this.data.reason,
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