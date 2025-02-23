import { BaseCommand } from './BaseCommand';
import { RevealCommandData } from '../types/commands';
import { YGODuelEvents } from '../types/duel-events';

export class RevealCommand extends BaseCommand {
    public baseType: string = "RevealCommand";
    private data: RevealCommandData;

    constructor(data: RevealCommandData) {
        super();
        this.type = "Reveal";
        this.data = data;
    }

    override exec(): void {
        this.YGO.duelLog.dispatch<YGODuelEvents.Reveal>({
            type: YGODuelEvents.LogType.Reveal,
            player: this.data.player,
            commandId: this.getCommandId(),
            id: this.data.id,
            originZone: this.data.originZone
        })
    }
}