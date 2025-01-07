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
        console.log("START ACTION IN HAND")
        this.duel.events.publish("set-ui-action", {
            type: "card-zone-menu",
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
        console.log("END ACTION IN HAND")
        this.duel.events.publish("clear-ui-action");

        // const container = document.getElementById("ygo-player-core")! as HTMLDivElement;
        // container.removeEventListener("click", this.clickCb);
    }
}