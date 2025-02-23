import { BaseCommand } from './BaseCommand';
import { FlipCommandData } from '../types/commands';
import { CardPosition } from '../types/types';
import { YGOGameUtils } from '../game/YGOGameUtils';
import { YGODuelEvents } from '../types/duel-events';

export class FlipCommand extends BaseCommand {
    public baseType: string = "FlipCommand";
    private data: FlipCommandData;
    private prevPosition: CardPosition | undefined;

    constructor(data: FlipCommandData) {
        super();
        this.type = "Flip";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone)!;

        this.prevPosition = card.position;

        if (YGOGameUtils.isFaceDown(card)) {
            card.position = "faceup-attack";
        } else {
            card.position = "faceup-defense";
        }

        this.YGO.duelLog.dispatch<YGODuelEvents.Flip>({
            type: YGODuelEvents.LogType.Flip,
            commandId: this.getCommandId(),
            player: this.data.player,
            id: this.data.id,
            originZone: this.data.originZone,
            previousPosition: this.prevPosition,
            position: card.position,
        })
    }

    override undo(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);

        if (this.prevPosition) {
            card.position = this.prevPosition;
        }
    }
}