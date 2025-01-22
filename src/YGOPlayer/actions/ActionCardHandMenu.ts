import { YGOAction } from "../core/components/YGOAction";
import { YGODuel } from "../core/YGODuel";

export class ActionCardHandMenu implements YGOAction {
    public name = "card-hand-menu";
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
        this.duel.events.publish("set-ui-action", {
            type: "card-hand-menu",
            data: this.data
        });
    }

    public onActionEnd() {
        this.duel.events.publish("clear-ui-action");
    }
}