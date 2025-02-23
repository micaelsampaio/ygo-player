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
        this.data?.cardInHand?.setActive(false);
        this.data = data;
    }

    public onActionStart() {
        this.data.cardInHand?.setActive(true);
        this.duel.events.dispatch("set-ui-action", {
            type: "card-hand-menu",
            data: this.data
        });
    }

    public onActionEnd() {
        this.data.cardInHand?.setActive(false);
        this.duel.events.dispatch("clear-ui-action");
    }
}