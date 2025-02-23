import { BaseCommand } from './BaseCommand';
import { Command, XYZSummonCommandData } from '../types/commands';
import { MoveCardCommand } from './MoveCardCommand';
import { Card, FieldZone } from '../types/types';
import { YGOUtils } from '../game/YGOUtils';
import { YGODuelEvents } from '../types/duel-events';

export class XYZSummonCommand extends BaseCommand {
    public baseType: string = "XYZSummonCommand";
    private data: XYZSummonCommandData;
    private commands: Command[];
    private overlayZone: FieldZone;

    constructor(data: XYZSummonCommandData) {
        super();
        this.type = "XYZ Summon";
        this.data = data;
        this.data.position = this.data.position || "faceup-attack";
        this.commands = [];
        this.overlayZone = YGOUtils.getOverlayZone(this.data.zone);

        this.data.materials.forEach(material => {
            this.commands.push(new XYZMaterialsMove({
                player: this.data.player,
                overlayZone: this.overlayZone,
                id: material.id,
                zone: material.zone
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
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);

        // TODO: @RMS MATERIALS OF MATERIAL ex: nerd to zeus purrely to noir

        card.materials = this.data.materials.map(material => {
            const materialCard = this.YGO.state.getCardById(material.id, material.zone);
            return materialCard;
        });

        this.execMultipleChildCommand(this.commands);

        this.YGO.duelLog.dispatch<YGODuelEvents.XYZSummon>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.XYZSummon,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            position: this.data.position!,
            materials: this.data.materials
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.zone);
        card.materials = [];
        this.undoMultipleChildCommand(this.commands);
    }
}

interface XYZMaterialsMoveData {
    player: number,
    id: number
    overlayZone: FieldZone
    zone: FieldZone
}

class XYZMaterialsMove extends BaseCommand {
    private data: XYZMaterialsMoveData;
    private card!: Card;

    constructor(data: XYZMaterialsMoveData) {
        super();
        this.data = data;
    }

    exec(): void {
        this.card = this.YGO.state.getCardById(this.data.id, this.data.zone);
        this.YGO.state.setCard(null, this.data.zone);

        this.YGO.duelLog.dispatch<YGODuelEvents.XYZOverlay>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.XYZOverlay,
            id: this.data.id,
            originZone: this.data.zone,
            overlayZone: this.data.overlayZone
        });
    }

    undo(): void {
        this.YGO.state.setCard(this.card, this.data.zone);
    }
}
