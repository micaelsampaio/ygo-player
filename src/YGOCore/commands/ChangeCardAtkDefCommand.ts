import { BaseCommand } from './BaseCommand';
import { ChangeCardAtkDefCommandData } from '../types/commands';
import { YGODuelEvents } from '../types/duel-events';
import { YGOUtils } from '../game/YGOUtils';

export class ChangeCardAtkDefCommand extends BaseCommand {
    private data: ChangeCardAtkDefCommandData;
    private prevAtk: number | undefined;
    private prevDef: number | undefined;

    constructor(data: ChangeCardAtkDefCommandData) {
        super();
        this.type = "Change Card Atk Def";
        this.data = data;
    }

    override exec(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.zone)!;

        if (YGOUtils.isNumeric(this.data.atk)) {
            this.prevAtk = card.currentAtk;
            card.currentAtk = Number(this.data.atk);
        }

        if (YGOUtils.isNumeric(this.data.def)) {
            this.prevDef = card.currentDef;
            card.currentAtk = Number(this.data.def);
        }

        this.YGO.duelLog.dispatch<YGODuelEvents.ChangeCardAtkDef>({
            player: this.data.player,
            commandId: this.getCommandId(),
            type: YGODuelEvents.LogType.Activate,
            id: this.data.id,
            zone: this.data.zone,
            atk: YGOUtils.isNumeric(this.data.atk) ? Number(this.data.atk) : null,
            def: YGOUtils.isNumeric(this.data.def) ? Number(this.data.def) : null,
        });
    }

    override undo(): void {
        const card = this.YGO.state.getCardById(this.data.id, this.data.zone);

        if (this.prevAtk) {
            card.currentAtk = this.prevAtk;
        }

        if (this.prevDef) {
            card.currentDef = this.prevDef;
        }
    }
}