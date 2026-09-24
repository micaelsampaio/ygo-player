import React, { useEffect } from "react";
import { Modal } from "./Modal";
import { bindEscapeToCancel } from "./escape-to-cancel";

const stopPointer = (e: React.SyntheticEvent) => e.stopPropagation();

/** Modal.Dialog preset for "are you sure?" steps in front of irreversible
 * duel actions. Escape cancels, and mouse down/up/click stay inside the dialog so
 * they never reach the board's 3D mouse handlers on .ygo-player-core. */
export function ConfirmDialog({
    visible,
    title,
    children,
    confirmLabel,
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
}: {
    visible: boolean;
    title: string;
    children: React.ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        if (!visible) return;
        return bindEscapeToCancel(document, onCancel);
    }, [visible, onCancel]);

    return <div onMouseDown={stopPointer} onMouseUp={stopPointer} role="presentation" onClick={stopPointer}>
        <Modal.Dialog visible={visible} close={onCancel} size="sm">
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
                <button type="button" className="ygo-btn ygo-btn-action" onClick={onCancel} autoFocus>
                    {cancelLabel}
                </button>
                <button type="button" className="ygo-btn ygo-btn-danger" onClick={onConfirm}>
                    {confirmLabel}
                </button>
            </Modal.Footer>
        </Modal.Dialog>
    </div>
}
