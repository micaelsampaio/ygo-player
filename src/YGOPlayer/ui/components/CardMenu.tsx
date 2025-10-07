import { YGOStatic } from "../../core/YGOStatic";
import { stopPropagationCallback } from "../../scripts/utils";

export function CardMenu({ menuRef, children, indicator, playerIndex, cols, x, y }: any) {
    const style: any = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined }

    return <div className={`ygo-card-menu ${cols ? "ygo-card-menu-cols" : ""} ${indicator ? YGOStatic.isPlayerPOV(playerIndex) ? "ygo-card-menu-indicator" : "ygo-card-menu-indicator ygo-player-1" : ""}`}
        ref={menuRef}
        style={style}
        onClick={stopPropagationCallback}
        onMouseMove={stopPropagationCallback}
        onMouseDown={stopPropagationCallback}
        onMouseUp={stopPropagationCallback}
    >
        <div className="ygo-card-menu-items" onClick={stopPropagationCallback}>
            {children}
        </div>
    </div>

}