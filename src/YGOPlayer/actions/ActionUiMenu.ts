import { YGOAction } from "../core/components/YGOAction";
import { YGODuel } from "../core/YGODuel";

export class ActionUiMenu implements YGOAction {
    public name = "action-ui-menu";
    private duel: YGODuel;
    public eventType: string = "";
    public eventData: any = null;
    public unsubscribeKeyEvents?: () => void;

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
        this.unsubscribeKeyEvents = this.duel.globalHotKeysManager.on("escPressed", () => {
            this.duel.events.dispatch("clear-ui-action");
        });
    }

    public onActionEnd() {
        this.duel.events.dispatch("clear-ui-action");
        this.unsubscribeKeyEvents?.();
        this.unsubscribeKeyEvents = undefined;
    }
}