import { BaseCommand } from './BaseCommand';
import { BanishCommandData, Command } from '../types/commands';
import { FieldZone } from '../types/types';
import { MoveCardCommand } from './MoveCardCommand';
import { YGOGameUtils } from '../game/YGOGameUtils';
import { YGOCore } from '../game/YGOCore';

export class BanishCommand extends BaseCommand {
    public baseType: string = "BanishCommand";
    private data: BanishCommandData;
    private zone!: FieldZone;
    private banishCommand!: Command;

    constructor(data: BanishCommandData) {
        super();
        this.data = data;
        this.data.position = this.data.position || "faceup"
        this.type = this.data.position === "faceup" ? "Banish" : "Banish FD";
    }

    init(ygo: YGOCore): void {
        super.init(ygo);

        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        this.zone = YGOGameUtils.createZone("B", card.originalOwner, 1);

        this.banishCommand = new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            position: this.data.position,
            zone: this.zone
        });
    }

    exec(): void {
        this.execChildCommand(this.banishCommand);
    }

    undo(): void {
        this.undoChildCommand(this.banishCommand);
    }
}