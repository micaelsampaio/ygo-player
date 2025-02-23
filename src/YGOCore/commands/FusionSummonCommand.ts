import { BaseCommand } from './BaseCommand';
import { Command, FusionSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { SendCardToGYCommand } from './SendCardToGY';
import { YGODuelEvents } from '../types/duel-events';
import { YGOCore } from '../game/YGOCore';
import { FieldZone } from '../types/types';

export class FusionSummonCommand extends BaseCommand {
    public baseType: string = "FusionSummonCommand";
    private data: FusionSummonCommandData;
    private commands: Command[];
    private materials: { id: number, zone: FieldZone, owner: number }[] = [];

    constructor(data: FusionSummonCommandData) {
        super();
        this.type = "Fusion Summon";
        this.data = data;
        this.data.position = this.data.position || "faceup-attack";
        this.commands = [];
    }

    init(ygo: YGOCore): void {
        super.init(ygo);

        this.materials = this.data.materials.map(material => {
            const materialCard = this.YGO.state.getCardById(material.id, material.zone);

            this.commands.push(new SendCardToGYCommand({
                player: this.data.player,
                id: material.id,
                originZone: material.zone,
                reason: "Fusion Summon"
            }));

            return {
                id: material.id,
                zone: material.zone,
                owner: materialCard.originalOwner,
            }
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

        this.YGO.duelLog.dispatch<YGODuelEvents.FusionSummon>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.FusionSummon,
            id: this.data.id,
            originZone: this.data.originZone,
            position: this.data.position!,
            zone: this.data.zone,
            materials: this.materials
        });
    }

    override undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}