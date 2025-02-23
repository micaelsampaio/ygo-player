import { YGOAction } from "../core/components/YGOAction";
import { YGODuel } from "../core/YGODuel";

export class ActionCardZoneMenu implements YGOAction {
    public name = "card-zone-menu";
    private duel: YGODuel;
    private data: any;
    private clickCb: any;

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
    }

    public onActionEnd() {
        this.duel.events.dispatch("clear-ui-action");
    }
}