import { useEffect } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import { isTabVisible } from "./PresenceReporter";

/**
 * The host's socket reconnected (assist.onReconnect): the duel resumes on the new socket
 * (YGOServerActions.resumeAfterReconnect) and the server hears again that the player is here.
 * Renders nothing.
 */
export function ReconnectResumer({ duel }: { duel: YGODuel }) {
    useEffect(() => {
        const onReconnect = duel.assist?.onReconnect;
        if (!onReconnect || !duel.assist?.resume) return;
        return onReconnect(() => {
            void duel.serverActions.resumeAfterReconnect().then((outcome) => {
                if (outcome === "resumed") duel.serverActions.room.send("duel:presence", { visible: isTabVisible() });
            });
        });
    }, [duel]);
    return null;
}
