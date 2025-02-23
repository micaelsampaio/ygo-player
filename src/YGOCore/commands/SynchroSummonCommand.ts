import { BaseCommand } from './BaseCommand';
import { Command, SynchroSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { SendCardToGYCommand } from './SendCardToGY';
import { YGODuelEvents } from '../types/duel-events';

export class SynchroSummonCommand extends BaseCommand {
    public baseType: string = "SynchroSummonCommand";
    private data: SynchroSummonCommandData;
    private commands: Command[];

    constructor(data: SynchroSummonCommandData) {
        super();
        this.type = "Synchro Summon";
        this.data = data;
        this.data.position = this.data.position || "faceup-attack";
        this.commands = [];

        this.data.materials.forEach(material => {
            this.commands.push(new SendCardToGYCommand({
                player: this.data.player,
                id: material.id,
                originZone: material.zone,
                reason: "Synchro Summon"
            }));
        });

        this.commands.push(new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position,
            log: false
        }));
    }

    override exec(): void {
        this.execMultipleChildCommand(this.commands);

        this.YGO.duelLog.dispatch<YGODuelEvents.SynchroSummon>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.SynchroSummon,
            id: this.data.id,
            originZone: this.data.originZone,
            position: this.data.position!,
            zone: this.data.zone,
            materials: this.data.materials
        });
    }

    override undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}