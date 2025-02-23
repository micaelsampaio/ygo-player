import { BaseCommand } from './BaseCommand';
import { Command, LinkSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { SendCardToGYCommand } from './SendCardToGY';
import { YGODuelEvents } from '../types/duel-events';
import { CardPosition, FieldZone } from '../types/types';
import { YGOCore } from '../game/YGOCore';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class LinkSummonCommand extends BaseCommand {
    public baseType: string = "LinkSummonCommand";
    private data: LinkSummonCommandData;
    private commands: Command[];
    private position: CardPosition;
    private materials: { id: number, zone: FieldZone, owner: number }[] = [];

    constructor(data: LinkSummonCommandData) {
        super();
        this.type = "Link Summon";
        this.data = data;
        this.position = "faceup-attack";
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
                reason: "Link Summon"
            }));

            return {
                id: material.id,
                zone: material.zone,
                owner: materialCard.originalOwner,
            }
        });

        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        const zoneData = YGOGameUtils.getZoneData(this.data.zone);

        if (zoneData.zone === "EMZ") {
            this.data.zone = YGOGameUtils.createZone(zoneData.zone, card.owner, zoneData.zoneIndex);
        }

        this.commands.push(new MoveCardCommand({
            player: this.data.player,
            type: this.type,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.position,
            log: false
        }));
    }

    override exec(): void {
        this.execMultipleChildCommand(this.commands);

        this.YGO.duelLog.dispatch<YGODuelEvents.LinkSummon>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.LinkSummon,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            materials: this.materials
        });
    }

    override undo(): void {
        this.undoMultipleChildCommand(this.commands);
    }
}