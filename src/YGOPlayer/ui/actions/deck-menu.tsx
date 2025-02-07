import { useLayoutEffect, useRef } from "react";
import { YGOCommands } from "../../../YGOCore";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Deck } from "../../game/Deck";

export function DeckMenu({ duel, deck, mouseEvent }: { duel: YGODuel, deck: Deck, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const menuRef = useRef<HTMLDivElement>(null);

    const drawFromDeck = (e: React.MouseEvent) => {
        duel.ygo.exec(new YGOCommands.DrawFromDeckCommand({ player: duel.getActivePlayer() }));
    }

    const viewDeck = () => {
        duel.events.publish("toggle-ui-menu", { group: "game-popup", type: "view-main-deck" });
    }

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const size = container.getBoundingClientRect();
        const { x, y, width, height } = getTransformFromCamera(duel, deck.gameObject);
        container.style.top = (y - size.height) + "px";
        container.style.left = (x - (size.width / 2) + (width / 2)) + "px";
    }, [deck]);

    const mainDeckSize = duel.ygo.state.fields[0].mainDeck.length;

    return <CardMenu menuRef={menuRef}>
        <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={drawFromDeck}>Draw</button>
        <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={drawFromDeck}>Mil</button>
        <button className="ygo-card-item" type="button" onClick={viewDeck}>View Deck</button>
    </CardMenu >

}