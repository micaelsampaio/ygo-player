import type { YGOAction } from "../core/components/YGOAction";
import type { YGODuel } from "../core/YGODuel";
import type { Card } from "ygo-core";
import type { GameCardHand } from "../game/GameCardHand";

/** The clicked hand card; spread into the card-hand menu as props. */
export interface CardHandMenuData {
    duel: YGODuel;
    card: Card;
    cardInHand: GameCardHand;
    index: number;
    player: number;
    mouseEvent: MouseEvent;
}

export class ActionCardHandMenu implements YGOAction {
    public name = "card-hand-menu";
    private duel: YGODuel;
    /** Set by setData before the action starts. */
    public data!: CardHandMenuData;
    public unsubscribeKeyEvents?: () => void;

    constructor(duel: YGODuel) {
        this.duel = duel;
    }

    public setData(data: CardHandMenuData) {
        this.data?.cardInHand?.setActive(false);
        this.data = data;
    }

    public onActionStart() {
        this.data?.cardInHand?.setActive(true);
        this.duel.events.dispatch("set-ui-action", {
            type: "card-hand-menu",
            data: this.data
        });
        this.unsubscribeKeyEvents = this.duel.globalHotKeysManager.on("escPressed", () => {
            this.duel.events.dispatch("clear-ui-action");
        });
    }

    public onActionEnd() {
        this.data?.cardInHand?.setActive(false);
        this.duel.events.dispatch("clear-ui-action");
        this.unsubscribeKeyEvents?.();
        this.unsubscribeKeyEvents = undefined;
    }
}