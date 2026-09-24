/**
 * Escape cancels an open confirm step. Listens in the capture phase on
 * `target` (the document) and stops the event there, so the global
 * tinykeys "Escape" binding on window (which toggles the settings menu)
 * doesn't also fire. Returns the unsubscribe.
 */
export function bindEscapeToCancel(target: EventTarget, onCancel: () => void): () => void {
    const handler = (event: Event) => {
        if ((event as KeyboardEvent).key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
    };
    target.addEventListener("keydown", handler, { capture: true });
    return () => target.removeEventListener("keydown", handler, { capture: true });
}
