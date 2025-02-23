import { YGOAction } from "../core/components/YGOAction";
import { YGODuel } from "../core/YGODuel";

export class ActionUiMenu implements YGOAction {
    public name = "action-ui-menu";
    private duel: YGODuel;
    public eventType: string = "";
    public eventData: any = null;

    constructor(duel: YGODuel, { eventType, eventData = null }: { eventType: string, eventData?: any }) {
        this.duel = duel;
        this.eventType = eventType;
        this.eventData = eventData;
    }

    public onActionStart() {
        this.duel.events.dispatch("set-ui-action", {
            type: this.eventType,
            data: this.eventData
        });
    }

    public onActionEnd() {
        this.duel.events.dispatch("clear-ui-action");
    }
}