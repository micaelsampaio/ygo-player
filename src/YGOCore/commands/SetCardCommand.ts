import { BaseCommand } from './BaseCommand';
import { Command, SetCardCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { CardPosition } from '../types/types';
import { RevealCommand } from './RevealCommand';
import { YGOCore } from '../game/YGOCore';
import { YGOGameUtils } from '../game/YGOGameUtils';
import { YGODuelEvents } from '../types/duel-events';

export class SetCardCommand extends BaseCommand {
    public baseType: string = "SetCardCommand";
    private data: SetCardCommandData;
    private prevPosition: CardPosition | undefined;
    private isMonster: boolean;
    private commands: Command[];

    constructor(data: SetCardCommandData) {
        super();
        this.type = "Set ST";
        this.isMonster = false;
        this.data = data;
        this.commands = [];
    }

    init(ygo: YGOCore) {
        super.init(ygo);

        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        this.isMonster = YGOGameUtils.isMonster(card);
        this.type = this.isMonster ? "Set Monster" : "Set ST";

        this.commands = [];

        if (this.data.zone) {
            this.commands.push(new MoveCardCommand({
                player: this.data.player,
                type: this.type,
                id: this.data.id,
                originZone: this.data.originZone,
                zone: this.data.zone,
                position: "facedown"
            }));

            if (this.data.reveal) {
                this.commands.push(new RevealCommand({
                    player: this.data.player,
                    id: this.data.id,
                    originZone: this.data.zone,
                }));
            }
        }
    }

    exec(): void {
        if (this.commands.length > 0) {
            this.execMultipleChildCommand(this.commands);
        } else {
            const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
            this.prevPosition = card.position;
            card.position = "facedown";

            if (this.type === "Set Monster") {
                this.YGO.duelLog.dispatch<YGODuelEvents.SetMonster>({
                    type: YGODuelEvents.LogType.SetMonster,
                    commandId: this.getCommandId(),
                    player: this.data.player,
                    id: this.data.id,
                    originZone: this.data.originZone,
                })
            } else {
                this.YGO.duelLog.dispatch<YGODuelEvents.SetMonster>({
                    type: YGODuelEvents.LogType.SetST,
                    commandId: this.getCommandId(),
                    player: this.data.player,
                    id: this.data.id,
                    originZone: this.data.originZone,
                })
            }
        }
    }

    undo(): void {
        if (this.commands.length > 0) {
            this.undoMultipleChildCommand(this.commands);
        }

        if (this.prevPosition) {
            const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
            card.position = this.prevPosition;
        }
    }
}