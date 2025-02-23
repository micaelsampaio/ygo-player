import { BaseCommand } from './BaseCommand';
import { XYZAttachCommandData as XYZAttachMaterialCommandData } from '../types/commands';
import { YGOUtils } from '../game/YGOUtils';
import { Card } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';

export class XYZAttachMaterialCommand extends BaseCommand {
    public baseType: string = "XYZAttachMaterialCommand";
    private data: XYZAttachMaterialCommandData;
    private materialCardReference!: Card;

    constructor(data: XYZAttachMaterialCommandData) {
        super();
        this.type = "XYZ Attach Material";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardFromZone(this.data.zone)!;
        this.materialCardReference = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        this.YGO.state.setCard(null, this.data.originZone);
        card.materials.push(this.materialCardReference);

        console.log("TCL:: EXEC ATTACH:: ", this.materialCardReference.name, this.data.originZone);

        const overlayZone = YGOUtils.getOverlayZone(this.data.zone);

        this.YGO.duelLog.dispatch<YGODuelEvents.XYZAttach>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.XYZSummon,
            id: this.data.id,
            originZone: this.data.originZone,
            overlayZone: overlayZone
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardFromZone(this.data.zone)!;
        this.YGO.state.setCard(this.materialCardReference, this.data.originZone);
        card.materials.splice(card.materials.indexOf(this.materialCardReference), 1);
    }
}