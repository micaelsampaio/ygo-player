import { BaseCommand } from './BaseCommand';
import { MoveCardCommandData } from '../types/commands';
import { Card, CardPosition, FieldZone } from '../types/types';
import { YGOUtils } from '../game/YGOUtils';
import { YGODuelEvents } from '../types/duel-events';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class MoveCardCommand extends BaseCommand {
    public baseType: string = "MoveCardCommand";
    public data: MoveCardCommandData;
    private prevPosition!: CardPosition;
    private materialsToGY: Card[];

    constructor(data: MoveCardCommandData) {
        super();
        const type = data.type || "Move Card";
        this.type = type;
        this.data = data;
        this.materialsToGY = [];
        this.data.type = type;
    }

    override exec(): void {
        console.log(`Exec: ${this.data.type} ${this.data.id} from: ${this.data.originZone} to: ${this.data.zone}`);
        const { log = true } = this.data;
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone);
        const zoneData = YGOGameUtils.getZoneData(this.data.zone);
        const field = this.YGO.getField(zoneData.player);

        if (this.data.zone === "ED" || this.data.zone === "ED2") {
            this.prevPosition = card.position;
            this.data.position = YGOGameUtils.isPendulumCard(card) ? "faceup" : "facedown";
        }

        if (this.data.position) {
            this.prevPosition = card.position;
            card.position = this.data.position;
        }

        // XYZ send materials to GY if send card to Gy or banish
        if (this.sendMaterialsToGy(card, this.data.zone)) {
            const overlayZone = YGOUtils.getOverlayZone(this.data.originZone);
            this.materialsToGY = card.materials;
            card.materials.forEach(material => {
                this.YGO.state.setCard(material, "GY");
                this.YGO.duelLog.dispatch<YGODuelEvents.SendToGY>({
                    player: this.data.player,
                    commandId: this.getCommandId(),
                    type: YGODuelEvents.LogType.SendToGY,
                    id: material.id,
                    originZone: overlayZone,
                    zone: this.data.zone,
                    reason: "XYZ Material"
                });
            });
            card.materials = [];
        }

        // TODO IF PENDULUMN send cards to Extra Deck
        this.YGO.state.moveCard(card, this.data.originZone, this.data.zone);

        if (zoneData.zone === "ED") { // if sent to ED say the cardIndex
            const extraDeckIndex = field.extraDeck.findIndex(c => c === card);
            if (extraDeckIndex !== -1) {
                this.data.zone = YGOGameUtils.createZone(zoneData.zone, zoneData.player, extraDeckIndex + 1);
            }
        }

        if (log) {
            this.YGO.duelLog.dispatch<any>({
                player: this.data.player,
                commandId: this.getCommandId(),
                type: this.type as any,
                id: this.data.id,
                originZone: this.data.originZone,
                zone: this.data.zone,
                reason: this.data.reason,
                position: card.position
            });
        }
    }

    override undo(): void {
        console.log(`Undo: ${this.data.type} ${this.data.id} from: ${this.data.originZone} to: ${this.data.zone}`);

        const card = this.YGO.state.getCardById(this.data.id, this.data.zone);

        if (this.materialsToGY.length > 0) {
            this.materialsToGY.forEach(() => {
                this.YGO.state.setCard(null, "GY");
            });
            card.materials = this.materialsToGY;
        }

        if (this.prevPosition) {
            card.position = this.prevPosition;
        }

        this.YGO.state.moveCard(card, this.data.zone, this.data.originZone);
    }

    private sendMaterialsToGy(card: Card, zone: FieldZone): boolean {
        if (!card.materials || card.materials.length === 0) return false;
        if (this.data.zone.startsWith("GY")) return true;
        if (this.data.zone === "B" || this.data.zone === "B2") return true;
        if (this.data.zone.startsWith("B-") || this.data.zone.startsWith("B2-")) return true;
        return false;
    }
}