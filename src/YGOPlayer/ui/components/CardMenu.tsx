
export function CardMenu({ menuRef, children, indicator, cols, x, y }: any) {
    const style: any = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined }

    return <div className={`ygo-card-menu ${cols ? "ygo-card-menu-cols" : ""} ${indicator ? "ygo-card-menu-indicator" : ""}`}
        ref={menuRef}
        style={style}
        onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
        onMouseMove={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
        onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
        onMouseUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
    >
        <div className="ygo-card-menu-items" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
        }}>
            {children}
        </div>
    </div>

}