import { useEffect } from "react";
import type { YGODuel } from "../../../core/YGODuel";

/** Whether the duel tab counts as "there" for the server's pause timeout. */
export function isTabVisible(doc: Pick<Document, "visibilityState"> | undefined = typeof document === "undefined" ? undefined : document): boolean {
    return doc?.visibilityState !== "hidden";
}

/**
 * Tells the server whether this tab is visible (duel:presence): while it is, a bot turn paused
 * for the player waits the long timeout (5 min) instead of answering for them after 90 s.
 * Renders nothing.
 */
export function PresenceReporter({ duel }: { duel: YGODuel }) {
    useEffect(() => {
        const report = () => duel.serverActions?.room?.send?.("duel:presence", { visible: isTabVisible() });
        report();
        document.addEventListener("visibilitychange", report);
        window.addEventListener("focus", report);
        return () => {
            document.removeEventListener("visibilitychange", report);
            window.removeEventListener("focus", report);
        };
    }, [duel]);
    return null;
}
