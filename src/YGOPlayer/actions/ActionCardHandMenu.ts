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

        // this.clickCb = (e: MouseEvent) => {
        //     e.preventDefault();
        //     e.stopPropagation();

        //     this.duel.actionManager.clearAction();
        //     console.log("CANCEL CARD IN HAND");
        // }

        // const container = document.getElementById("ygo-player-core")! as HTMLDivElement;

        // container.addEventListener("click", this.clickCb);
    }

    public onActionEnd() {
        this.duel.events.publish("clear-ui-action");

        // const container = document.getElementById("ygo-player-core")! as HTMLDivElement;
        // container.removeEventListener("click", this.clickCb);
    }
}