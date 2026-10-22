import { useState, type CSSProperties, type ReactNode } from "react";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";
import { isMasterDuelStyle } from "../assist-card-actions";
import { AssistCardActions } from "./AssistCardActions";
import { useDuelPerspective } from "../duel-perspective";
import { useMenuBoxRef, type MenuBoxRef } from "./use-anchored-menu";

/**
 * `assist` (a card menu for the local player's own card): in Master Duel style duels the
 * engine's legal moves for the card come first and the free-play moves fold behind a toggle.
 */
export interface CardMenuProps {
    /** Gets the menu box, for the caller's positioning (useRef<HTMLDivElement>() or useRef(null)). */
    menuRef?: MenuBoxRef;
    children?: ReactNode;
    /** The pointer arrow towards the card, flipped for the top side's cards. */
    indicator?: boolean;
    playerIndex?: number;
    cols?: boolean | number;
    x?: number;
    y?: number;
    assist?: { duel: YGODuel; card: Card; zone: string };
}

export function CardMenu({ menuRef, children, indicator, playerIndex, cols, x, y, assist }: CardMenuProps) {
    const perspective = useDuelPerspective();
    const [freePlayOpen, setFreePlayOpen] = useState(false);
    const engineMoves = !!assist && isMasterDuelStyle(assist.duel) && assist.duel.perspective.isPlayer(assist.card.owner);
    const style: CSSProperties = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined }
    const attachMenu = useMenuBoxRef(menuRef);

    return <div className={`ygo-card-menu ${cols ? "ygo-card-menu-cols" : ""} ${indicator ? playerIndex !== undefined && perspective.isPlayerPOV(playerIndex) ? "ygo-card-menu-indicator" : "ygo-card-menu-indicator ygo-player-1" : ""}`}
        ref={attachMenu}
        style={style}
        role="presentation"
        onClick={stopPropagationCallback}
        onMouseMove={stopPropagationCallback}
        onMouseDown={stopPropagationCallback}
        onMouseUp={stopPropagationCallback}
    >
        <div className="ygo-card-menu-items" role="presentation" onClick={stopPropagationCallback}>
            {engineMoves ? <>
                <AssistCardActions duel={assist.duel} card={assist.card} zone={assist.zone} />
                <button
                    type="button"
                    className="ygo-card-item ygo-card-item-free-play"
                    aria-expanded={freePlayOpen}
                    onClick={() => setFreePlayOpen((open) => !open)}
                    title="Moves outside the rules engine (for cards it can't play yet)"
                >
                    {freePlayOpen ? "Hide free-play moves" : "Free-play moves…"}
                </button>
                {freePlayOpen && children}
            </> : children}
        </div>
    </div>

}

// Remembered for the session: once you open "More", menus keep it open.
let moreOpenPref = false;

/**
 * The less common moves (destroy, banish, to deck…) folded behind a "More" toggle, so a card's
 * menu opens on the few moves you usually want.
 */
export function CardMenuMore({ children }: { children?: ReactNode }) {
    const [open, setOpen] = useState(moreOpenPref);
    return <>
        <button
            type="button"
            className="ygo-card-item ygo-card-item-free-play"
            aria-expanded={open}
            onClick={() => setOpen((o) => { moreOpenPref = !o; return !o; })}
        >
            {open ? "Fewer moves" : "More moves…"}
        </button>
        {open && children}
    </>
}
