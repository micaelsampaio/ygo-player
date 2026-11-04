/** Per target: how many dialogs (non-fallback bindings) are listening for Escape. */
const dialogBindings = new WeakMap<EventTarget, number>();

export interface EscapeToCancelOptions {
    /**
     * A fallback Escape (a held play's cancel): it steps aside — leaves the
     * event alone — while a dialog's own Escape is bound on the same target,
     * or while `yieldTo()` says something else owns the key.
     */
    fallback?: boolean;
    yieldTo?: () => boolean;
}

/** Whether a fallback Escape on `target` has to step aside right now. */
export function escapeOwnedElsewhere(target: EventTarget, yieldTo?: () => boolean): boolean {
    return (dialogBindings.get(target) ?? 0) > 0 || !!yieldTo?.();
}

/**
 * Escape cancels an open confirm step. Listens in the capture phase on
 * `target` (the document) and stops the event there, so the global
 * tinykeys "Escape" binding on window (which toggles the settings menu)
 * doesn't also fire. Returns the unsubscribe.
 *
 * Listeners on the same target all run even when one stops the event, so a
 * fallback binding checks for a dialog's binding instead: one Escape never
 * both closes a dialog and cancels the play under it.
 */
export function bindEscapeToCancel(target: EventTarget, onCancel: () => void, opts: EscapeToCancelOptions = {}): () => void {
    const handler = (event: Event) => {
        if ((event as KeyboardEvent).key !== "Escape") return;
        if (opts.fallback && escapeOwnedElsewhere(target, opts.yieldTo)) return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
    };
    target.addEventListener("keydown", handler, { capture: true });
    if (!opts.fallback) dialogBindings.set(target, (dialogBindings.get(target) ?? 0) + 1);
    let bound = true;
    return () => {
        if (!bound) return;
        bound = false;
        target.removeEventListener("keydown", handler, { capture: true });
        if (!opts.fallback) dialogBindings.set(target, Math.max(0, (dialogBindings.get(target) ?? 1) - 1));
    };
}
