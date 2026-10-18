import type { CSSProperties, ReactNode } from "react";
import { stopPropagationCallback } from "../../scripts/utils";
import { useMenuBoxRef, type MenuBoxRef } from "./use-anchored-menu";

export function ActionsFloatingMenu({ menuRef, children, x, y, transform }: {
    menuRef?: MenuBoxRef;
    children?: ReactNode;
    x?: number;
    y?: number;
    /** A CSS transform for the menu box (e.g. centring it on x/y). */
    transform?: string;
}) {
    const attachMenu = useMenuBoxRef(menuRef);
    const style: CSSProperties = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined, transform }

    return <div className="ygo-floating-actions-menu"
        ref={attachMenu}
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