import { YGOCommands } from "../../../YGOCore";
import { YGODuel } from "../../core/YGODuel";

export function DeckMenu({ duel, clearAction, mouseEvent }: { duel: YGODuel, clearAction: Function, mouseEvent: React.MouseEvent }) {
    const x = mouseEvent.clientX; // Horizontal mouse position in px
    const y = mouseEvent.clientY; // Vertical mouse position in px

    const drawFromDeck = (e: React.MouseEvent) => {
        duel.ygo.exec(new YGOCommands.DrawFromDeckCommand({ player: duel.getActivePlayer() }));
    }

    const viewDeck = () => {
        // disable actions 
        duel.events.publish("toggle-ui-menu", { key: "game-popup", type: "view-main-deck" });
    }

    const mainDeckSize = duel.ygo.state.fields[0].mainDeck.length;

    return <>
        <div className="ygo-card-menu" style={{ top: `${y}px`, left: `${x}px` }} onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            duel.events.publish("clear-ui-action");
            console.log("TEMP:: MOUSE CLICK REACT", e.target);
        }}>
            <div onClick={e => e.stopPropagation()}>
                <div>
                    <button disabled={mainDeckSize === 0} type="button" onClick={drawFromDeck}>Draw</button>
                </div>
                <div>
                    <button disabled={mainDeckSize === 0} type="button" onClick={drawFromDeck}>Mil</button>
                </div>
                <div>
                    <button type="button" onClick={viewDeck}>View Deck</button>
                </div>
            </div>
        </div>
    </>

}