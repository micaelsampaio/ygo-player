import { YGOAction } from "../core/components/YGOAction";
import { YGODuel } from "../core/YGODuel";

export class ActionCardZoneMenu implements YGOAction {
    public name = "card-zone-menu";
    private duel: YGODuel;
    private data: any;
    public unsubscribeKeyEvents?: () => void;


    constructor(duel: YGODuel) {
        this.duel = duel;
    }

    public setData(data: any) {
        this.data = data;
    }

    public onActionStart() {
        this.duel.events.dispatch("set-ui-action", {
            type: "card-zone-menu",
            data: this.data
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