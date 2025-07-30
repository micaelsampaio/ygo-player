import { useCallback, useEffect, useRef, useState } from "react";
import { Card, FieldZone } from "ygo-core";
import { YGODuel } from "../../../core/YGODuel";
import { stopPropagationCallback } from "../../../scripts/utils";
import { GameSettingsDialog } from "./components/game-settings";

enum SETTINGS_MODAL_TYPE {
    SETTINGS,
}

const MODALS: any = {
    [SETTINGS_MODAL_TYPE.SETTINGS]: GameSettingsDialog
}

export function GameSettingsMenu({ duel }: { duel: YGODuel, card: Card, originZone: FieldZone, player: number, clearAction: () => void; }) {
    const container = useRef<HTMLDivElement>(null);
    const backdrop = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisble] = useState(false);
    const [modal, setModal] = useState<{ id: SETTINGS_MODAL_TYPE } | undefined>({ id: SETTINGS_MODAL_TYPE.SETTINGS });

    const closeSettings = () => {
        duel.events.dispatch("close-ui-menu", { type: "settings-menu" });
    }

    const canSaveReplay = !!duel.config.actions?.saveReplay;
    const canReportBug = !!duel.config.actions?.reportBug;

    const saveReplay = useCallback(async () => {
        if (!canSaveReplay) return;

        try {
            const replayData = duel.ygo.getReplayData();
            await duel.config.actions!.saveReplay!(replayData);
        } catch { }
    }, [duel]);

    const reportBug = useCallback(async () => {
        if (!canReportBug) return;
        try {
            const replayData = duel.ygo.getReplayData();
            const errors: string[] = [];

            await duel.config.actions!.reportBug!({ data: replayData, errors });

            closeSettings();
        } catch (error) { }
    }, [duel])

    useEffect(() => {
        if (isVisible) {
            container.current?.classList.add("ygo-visible");
            backdrop.current?.classList.add("ygo-visible");
            return () => {
                container.current?.classList.remove("ygo-visible");
                backdrop.current?.classList.remove("ygo-visible");
            }
        } else {
            setIsVisble(true);
        }
    }, [isVisible]);

    const MODAL = MODALS[modal?.id as any];

    return <>
        <div ref={backdrop} className="ygo-game-settings-backdrop"></div>
        <div ref={container} className="ygo-game-settings-menu"
            onMouseDown={stopPropagationCallback}
            onMouseMove={stopPropagationCallback}
            onMouseUp={stopPropagationCallback}
            onClick={stopPropagationCallback}
        >
            <div className="ygo-game-settings-left-panel-container">
                <div className="ygo-game-settings-left-panel">
                    <div className="ygo-game-settings-logo"></div>
                    <button disabled={modal?.id === SETTINGS_MODAL_TYPE.SETTINGS} className="ygo-btn ygo-btn-action">Settings</button>
                    {canSaveReplay && <button className="ygo-btn ygo-btn-action">Save Replay</button>}
                    {canReportBug && <button className="ygo-btn ygo-btn-action">Report a bug</button>}
                    <div className="ygo-flex-grow-1"></div>
                    <button className="ygo-btn ygo-btn-action">Close</button>
                </div>
            </div>
            <div className="ygo-game-settings-content">
                {MODAL && <MODAL duel={duel} />}
            </div>
        </div>
    </>
}