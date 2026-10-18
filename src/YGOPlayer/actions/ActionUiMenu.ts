import type { YGOAction } from "../core/components/YGOAction";
import type { YGODuel } from "../core/YGODuel";

export class ActionUiMenu implements YGOAction {
    public name = "action-ui-menu";
    private duel: YGODuel;
    public eventType: string = "";
    /** Spread into the menu as props. */
    public eventData: Record<string, unknown>;
    public unsubscribeKeyEvents?: () => void;

    constructor(duel: YGODuel, { eventType, eventData = {} }: { eventType: string, eventData?: Record<string, unknown> }) {
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