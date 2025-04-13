import React, { createContext, useContext } from 'react';
import { cancelMouseEventsCallback } from '../../scripts/ygo-utils';

type ModalContextType = {
    visible: boolean;
    close: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModalContext() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModalContext must be used within a Modal.Dialog");
    }
    return context;
}

function Dialog({
    visible,
    renderHidden = false,
    size,
    close,
    children,
}: {
    visible: boolean;
    renderHidden?: boolean;
    size?: "sm" | "md" | "xl" | "xxl"
    close: () => void;
    children: React.ReactNode;
}) {

    const closeModal = (e: React.MouseEvent) => {
        if (e) {
            cancelMouseEventsCallback(e);
        }
        close();
    }

    if (!visible && !renderHidden) return null;

    return (
        <ModalContext.Provider value={{ visible, close: closeModal as any }}>
            <div className={`ygo-player-dialog-container ${visible ? 'ygo-show' : ''} ${size ? `ygo-${size}` : ''}`}
                onClick={close}
                onMouseMove={cancelMouseEventsCallback}
            >
                <div className="ygo-player-dialog" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}>
                    {children}
                </div>
            </div>
        </ModalContext.Provider>
    );
}

function Header({ children = null, closeButton = true }: { children?: React.ReactNode, closeButton?: boolean }) {
    const { close } = useModalContext();

    return <div className="ygo-player-dialog-header">
        <div>{children}</div>{closeButton && <div className='ygo-close' onClick={close}></div>}
    </div>;
}

function Footer({ children }: { children: React.ReactNode }) {
    return <div className="ygo-player-dialog-footer">{children}</div>;
}

function Body({ children }: { children: React.ReactNode }) {
    return <div className="ygo-player-dialog-content">{children}</div>;
}

function BackDrop({ onClick }: { onClick?: () => void }) {
    return <div className="ygo-player-dialog-backdrop" onClick={onClick} />;
}

export const Modal = {
    Dialog,
    Header,
    Body,
    Footer,
    BackDrop,
};
