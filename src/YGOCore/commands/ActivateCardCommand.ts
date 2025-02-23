import { BaseCommand } from './BaseCommand';
import { ActivateCardCommandData } from '../types/commands';
import { Card, CardPosition } from '../types/types';
import { YGODuelEvents } from '../types/duel-events';
import { YGOGameUtils } from '../game/YGOGameUtils';

export class ActivateCardCommand extends BaseCommand {
    public baseType: string = "ActivateCardCommand";
    private data: ActivateCardCommandData;
    private prevPosition: CardPosition | undefined;

    constructor(data: ActivateCardCommandData) {
        super();
        this.type = "Activate";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.originZone || this.data.zone)!;

        if (this.data.originZone) {
            this.YGO.state.removeCard(this.data.originZone);
            this.YGO.state.setCard(card, this.data.zone);

            console.log(`Exec: Activate ${this.data.id} from ${this.data.originZone} in ${this.data.zone}`);
        } else {
            console.log(`Exec: Activate ${this.data.id} in ${this.data.zone}`);
        }

        this.prevPosition = card.position;

        if (YGOGameUtils.isFaceDown(card)) {
            if (YGOGameUtils.isSpellTrap(card)) {
                card.position = 'faceup';
            } else {
                card.position = 'faceup-attack';
            }
        }

        this.YGO.duelLog.dispatch<YGODuelEvents.Activate>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.Activate,
            id: this.data.id,
            originZone: this.data.originZone,
            zone: this.data.zone,
            previousPosition: this.prevPosition,
            position: card.position
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.zone);

        if (this.data.originZone) {
            this.YGO.state.removeCard(this.data.zone);
            this.YGO.state.setCard(card, this.data.originZone);

            console.log(`Undo: Activate ${this.data.id} from ${this.data.originZone} in ${this.data.zone}`);
        } else {
            console.log(`Undo: Activate ${this.data.id} in ${this.data.zone}`);
        }

        if (this.prevPosition) {
            card.position = this.prevPosition;
        }
    }
}