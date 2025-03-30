import { useCallback } from "react";
import { YGODuel } from "../../core/YGODuel";

export function BottomRightActions({ duel }: { duel: YGODuel }) {

    const toggleDuelLogs = useCallback(() => {
        duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "duel-log" });
    }, [duel]);

    const toggleGameReplayControls = useCallback(() => {
        duel.events.dispatch("toggle-ui-menu", { group: "game-overlay", type: "controls-menu" });
    }, [duel]);

    return <div className="game-actions-bottom-right">
        <button className="ygo-floating-button" onClick={toggleGameReplayControls}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z" /></svg>
        </button>
        <button className="ygo-floating-button" onClick={toggleDuelLogs}>
            <svg className="ygo-floating-button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V10.0002C3 7.17179 3 5.75757 3.87868 4.87889C4.64706 4.11051 5.82497 4.01406 8 4.00195" stroke="#fff" stroke-width="1.5"></path> <path d="M8 14H16" stroke="#fff" stroke-width="1.5" stroke-linecap="round"></path> <path d="M7 10.5H17" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"></path> <path d="M9 17.5H15" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"></path> <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="#FFF" stroke-width="1.5"></path> </g></svg>
        </button>
    </div>
}