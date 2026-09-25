import { useCallback, useEffect, useRef, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { stopPropagationCallback } from "../../../scripts/utils";
import { GameSettingsDialog } from "./components/game-settings";
import { GamControlsDialog } from "./components/game-controls";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { canSurrender } from "../../duel-status";
import { YGOClientType } from "ygo-core";

export enum SETTINGS_MODAL_TYPE {
    SETTINGS,
    CONTROLS
}

const MODALS: any = {
    [SETTINGS_MODAL_TYPE.SETTINGS]: GameSettingsDialog,
    [SETTINGS_MODAL_TYPE.CONTROLS]: GamControlsDialog
}

export function GameSettingsMenu({ duel, currentMenu = SETTINGS_MODAL_TYPE.SETTINGS }: { duel: YGODuel, currentMenu: SETTINGS_MODAL_TYPE }) {
    const container = useRef<HTMLDivElement>(null);
    const backdrop = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [modal, setModal] = useState<{ id: SETTINGS_MODAL_TYPE | null } | undefined>(() => {
        return { id: currentMenu };
    });
    const [mobileView, setMobileView] = useState<"nav" | "content">("nav");
    const isMobile = duel.core.isMobileLayout;

    const closeSettings = () => {
        setMobileView("nav");
        duel.events.dispatch("close-ui-menu", { type: "settings-menu" });
    };
    const canSaveReplay = !!duel.config.actions?.saveReplay;
    const canReportBug = !!duel.config.actions?.reportBug;
    const showSurrender = canSurrender({
        isPlayerClient: duel.client?.type === YGOClientType.PLAYER,
        gameMode: duel.config.gameMode,
    });
    const [confirmSurrender, setConfirmSurrender] = useState(false);
    const cancelSurrender = useCallback(() => setConfirmSurrender(false), []);

    const surrender = useCallback(() => {
        setConfirmSurrender(false);
        closeSettings();
        duel.gameActions.admitDefeat({ player: duel.serverActions.getActivePlayer() });
    }, [duel]);

    const saveReplay = useCallback(async () => {
        if (!canSaveReplay) return;
        try {
            const replayData = await duel.getReplayData();
            await duel.config.actions!.saveReplay!(replayData);
        } catch { }
    }, [duel]);

    const reportBug = useCallback(async () => {
        if (!canReportBug) return;
        try {
            // Mid-match the server keeps a hidden-info duel's full replay: report this client's own view.
            const replayData = await duel.getReplayData().catch(() => duel.ygo.getReplayData());
            const errors: string[] = [];
            await duel.config.actions!.reportBug!({ data: replayData, errors });
            closeSettings();
        } catch { }
    }, [duel]);

    const selectModal = (id: SETTINGS_MODAL_TYPE) => {
        setModal({ id });
        if (isMobile) setMobileView("content");
    };

    useEffect(() => {
        if (isVisible) {

            if (duel.core.isMobileLayout) {
                setModal({ id: null })
            } else {
                setModal({ id: SETTINGS_MODAL_TYPE.SETTINGS })
            }

            container.current?.classList.add("ygo-visible");
            backdrop.current?.classList.add("ygo-visible");
            return () => {
                container.current?.classList.remove("ygo-visible");
                backdrop.current?.classList.remove("ygo-visible");
            };
        } else {
            setIsVisible(true);
        }
    }, [isVisible]);

    const MODAL = MODALS[modal?.id as any];
    const mobileClass = isMobile ? `ygo-mobile-view-${mobileView}` : "";

    return <>
        <div ref={backdrop} className="ygo-game-settings-backdrop"></div>
        <div
            ref={container}
            className={`ygo-game-settings-menu ${mobileClass}`}
            onMouseDown={stopPropagationCallback}
            onMouseMove={stopPropagationCallback}
            onMouseUp={stopPropagationCallback}
            role="presentation"
            onClick={stopPropagationCallback}
        >
            <div className="ygo-game-settings-left-panel-container">
                <div className="ygo-game-settings-left-panel">
                    <div className="ygo-game-settings-logo"></div>
                    <button
                        disabled={modal?.id === SETTINGS_MODAL_TYPE.SETTINGS}
                        onClick={() => selectModal(SETTINGS_MODAL_TYPE.SETTINGS)}
                        className="ygo-btn ygo-btn-action"
                    >Settings</button>
                    <button
                        disabled={modal?.id === SETTINGS_MODAL_TYPE.CONTROLS}
                        onClick={() => selectModal(SETTINGS_MODAL_TYPE.CONTROLS)}
                        className="ygo-btn ygo-btn-action"
                    >Controls</button>
                    {canSaveReplay && <button onClick={saveReplay} className="ygo-btn ygo-btn-action">Save Replay</button>}
                    {canReportBug && <button onClick={reportBug} className="ygo-btn ygo-btn-action">Report a bug</button>}
                    <div className="ygo-flex-grow-1"></div>
                    {showSurrender && <button onClick={() => setConfirmSurrender(true)} className="ygo-btn ygo-btn-danger">Surrender</button>}
                    <button className="ygo-btn ygo-btn-action" onClick={closeSettings}>Close</button>
                </div>
            </div>

            <div className="ygo-game-settings-content">
                <button
                    className="ygo-btn ygo-btn-action ygo-mobile-back-btn"
                    onClick={() => {
                        setModal({ id: null });
                        setMobileView("nav")
                    }}
                >
                    Back
                </button>
                {MODAL && <MODAL duel={duel} close={closeSettings} />}
            </div>
        </div>

        <ConfirmDialog
            visible={confirmSurrender}
            title="Surrender?"
            confirmLabel="Surrender"
            onCancel={cancelSurrender}
            onConfirm={surrender}
        >
            You will lose this duel. This can't be undone.
        </ConfirmDialog>
    </>;
}