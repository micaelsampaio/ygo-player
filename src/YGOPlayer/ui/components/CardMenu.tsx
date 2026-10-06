import { useState } from "react";
import type { Card } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";
import { isMasterDuelStyle } from "../assist-card-actions";
import { AssistCardActions } from "./AssistCardActions";
import { useDuelPerspective } from "../duel-perspective";

/**
 * `assist` (a card menu for the local player's own card): in Master Duel style duels the
 * engine's legal moves for the card come first and the free-play moves fold behind a toggle.
 */
export function CardMenu({ menuRef, children, indicator, playerIndex, cols, x, y, assist }: any & { assist?: { duel: YGODuel; card: Card; zone: string } }) {
    const perspective = useDuelPerspective();
    const [freePlayOpen, setFreePlayOpen] = useState(false);
    const engineMoves = !!assist && isMasterDuelStyle(assist.duel) && assist.duel.perspective.isPlayer(assist.card.owner);
    const style: any = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined }

    return <div className={`ygo-card-menu ${cols ? "ygo-card-menu-cols" : ""} ${indicator ? perspective.isPlayerPOV(playerIndex) ? "ygo-card-menu-indicator" : "ygo-card-menu-indicator ygo-player-1" : ""}`}
        ref={menuRef}
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

/** Full-width label that starts a new group in a card menu (e.g. "More"). */
export function CardMenuSection({ label }: { label: string }) {
    return <div className="ygo-card-menu-section" role="presentation">{label}</div>
}
