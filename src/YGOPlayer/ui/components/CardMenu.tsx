import { stopPropagationCallback } from "../../scripts/utils";
import { useDuelPerspective } from "../duel-perspective";

export function CardMenu({ menuRef, children, indicator, playerIndex, cols, x, y }: any) {
    const perspective = useDuelPerspective();
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
            {children}
        </div>
    </div>

}

/** Full-width label that starts a new group in a card menu (e.g. "More"). */
export function CardMenuSection({ label }: { label: string }) {
    return <div className="ygo-card-menu-section" role="presentation">{label}</div>
}
