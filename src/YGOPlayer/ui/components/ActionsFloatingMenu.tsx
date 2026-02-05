import { stopPropagationCallback } from "../../scripts/utils";

export function ActionsFloatingMenu({ menuRef, children, x, y, transform }: any) {
    const style: any = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined, transform }

    return <div className="ygo-floating-actions-menu"
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