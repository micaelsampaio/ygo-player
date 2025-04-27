import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { CardMenu } from "../components/CardMenu";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { Deck } from "../../game/Deck";

export function DeckMenu({ duel, deck }: { duel: YGODuel, deck: Deck, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const menuRef = useRef<HTMLDivElement>(null);

    const [millCounter, setMilCounter] = useState<number>(1);

    const drawFromDeck = useCallback(() => {
        duel.gameActions.drawFromDeck({ player: deck.player });
    }, [deck]);

    const milFromDeck = useCallback(() => {
        duel.gameActions.milFromDeck({ player: deck.player, numberOfCards: millCounter });
    }, [deck, millCounter]);

    const viewDeck = () => {
        duel.events.dispatch("toggle-ui-menu", { group: "game-popup", type: "view-main-deck", data: { duel, deck } });
    }

    useLayoutEffect(() => {
        const container = menuRef.current!;
        const size = container.getBoundingClientRect();
        const { x, y, width, height } = getTransformFromCamera(duel, deck.gameObject);
        container.style.top = Math.max(0, (y - size.height)) + "px";
        container.style.left = (x - (size.width / 2) + (width / 2)) + "px";
    }, [deck]);

    const player = deck.player;
    const mainDeckSize = duel.ygo.state.fields[player].mainDeck.length;
    const field = duel.ygo.state.fields[player];
    const freeMonsterZones = field.monsterZone.filter((zone: any) => !zone).length;

    return <CardMenu menuRef={menuRef}>
        <div className="ygo-flex ygo-gap-2">
            <div className="ygo-flex-grow-1">
                <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={milFromDeck}>Mil</button>
            </div>
            <div>
                <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={() => setMilCounter(counter => counter > 0 ? counter - 1 : 0)}>+</button>
            </div>
            <div>
                {millCounter}
            </div>
            <div>
                <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={() => setMilCounter(counter => counter + 1)}>+</button>
            </div>
        </div>
        <button className="ygo-card-item" type="button" onClick={viewDeck}>View Deck</button>
        <button className="ygo-card-item" disabled={mainDeckSize === 0} type="button" onClick={drawFromDeck}>Draw</button>
    </CardMenu >

}