
export function CardMenu({ menuRef, children, x, y }: any) {
    const style: any = { left: x ? `${x}px` : undefined, top: y ? `${y}px` : undefined }

    return <div className="ygo-card-menu"
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