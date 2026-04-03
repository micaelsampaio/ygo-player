import { ReactNode } from "react";
import './mobile-aside.css';

export function YgoAsideMenu({ visible, isMobile, close, children }: {
    visible: boolean,
    isMobile: boolean,
    close: () => void,
    children: ReactNode
}) {
    if (!isMobile) return <>{children}</>;

    return (
        <div className={`ygo-aside-overlay${visible ? " ygo-aside-visible" : ""}`}>
            <div className="ygo-aside-menu">
                <div className="ygo-aside-content">{children}</div>
                <div className="ygo-aside-footer">
                    <button className="ygo-aside-close-btn" onClick={close}>✕</button>
                </div>
            </div>
        </div>
    );
}