import type { YGOAction } from "../core/components/YGOAction";
import type { YGODuel } from "../core/YGODuel";
import type { Card, FieldZone } from "ygo-core";
import type { GameCard } from "../game/GameCard";

/** The clicked field card; spread into the card-zone menu as props. */
export interface CardZoneMenuData {
    duel: YGODuel;
    gameCard: GameCard | null;
    card: Card;
    zone: FieldZone;
    mouseEvent: MouseEvent;
}

export class ActionCardZoneMenu implements YGOAction {
    public name = "card-zone-menu";
    private duel: YGODuel;
    /** Set by setData before the action starts. */
    private data?: CardZoneMenuData;
    public unsubscribeKeyEvents?: () => void;


    constructor(duel: YGODuel) {
        this.duel = duel;
    }

    public setData(data: CardZoneMenuData) {
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