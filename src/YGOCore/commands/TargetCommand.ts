import { BaseCommand } from './BaseCommand';
import { TargetCommandData } from '../types/commands';
import { YGODuelEvents } from '../types/duel-events';

export class TargetCommand extends BaseCommand {
    public baseType: string = "TargetCommand";
    private data: TargetCommandData;

    constructor(data: TargetCommandData) {
        super();
        this.type = "Target";
        this.data = data;
    }

    override exec(): void {
        this.YGO.duelLog.dispatch<YGODuelEvents.Target>({
            type: YGODuelEvents.LogType.Target,
            player: this.data.player,
            commandId: this.getCommandId(),
            id: this.data.id,
            originZone: this.data.originZone
        });
    }
}