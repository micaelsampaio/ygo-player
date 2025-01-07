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
        console.log("XX START ACTION IN HAND")
        this.duel.events.publish("set-ui-action", {
            type: this.eventType,
            data: this.eventData
        });
    }

    public onActionEnd() {
        console.log("XX ACTION ENDS");
        this.duel.events.publish("clear-ui-action");
    }
}