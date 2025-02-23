import { BaseCommand } from './BaseCommand';
import { ChangeCardPositionCommandData } from '../types/commands';
import { CardPosition } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';

export class ChangeCardPositionCommand extends BaseCommand {
    public baseType: string = "ChangeCardPositionCommand";
    private data: ChangeCardPositionCommandData;
    private prevPosition: CardPosition | undefined;

    constructor(data: ChangeCardPositionCommandData) {
        super();
        this.type = "Change Card Position";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone)!;

        this.prevPosition = card.position;

        card.position = this.data.position;

        this.YGO.duelLog.dispatch<YGODuelEvents.ChangeCardPosition>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.ChangeCardPosition,
            id: this.data.id,
            originZone: this.data.originZone,
            previousPosition: this.prevPosition,
            position: this.data.position,
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);

        if (this.prevPosition) {
            card.position = this.prevPosition;
        }
    }
}