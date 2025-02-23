import { BaseCommand } from './BaseCommand';
import { XYZDetachCommandData } from '../types/commands';
import { YGOUtils } from '../game/YGOUtils';
import { Card } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';

export class XYZDetachMaterialCommand extends BaseCommand {
    public baseType: string = "XYZDetachMaterialCommand";
    private data: XYZDetachCommandData;
    private materialCardReference!: Card;

    constructor(data: XYZDetachCommandData) {
        super();
        this.type = "XYZ Detach Material";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardFromZone(this.data.zone)!;
        this.materialCardReference = card.materials[this.data.materialIndex];
        card.materials.splice(this.data.materialIndex, 1);

        this.YGO.state.setCard(this.materialCardReference, "GY");

        const overlayZone = YGOUtils.getOverlayZone(this.data.zone);

        this.YGO.duelLog.dispatch<YGODuelEvents.XYZDetach>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.XYZDetachMaterial,
            id: card.id,
            materialIndex: this.data.materialIndex,
            overlayZone: overlayZone
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardFromZone(this.data.zone)!;
        card.materials.splice(card.materials.indexOf(this.materialCardReference), 1);
        this.YGO.state.setCard(null, "GY");
    }
}