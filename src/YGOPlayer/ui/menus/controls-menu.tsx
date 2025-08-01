import { useCallback, useEffect } from "react";
import { YGODuel } from "../../core/YGODuel";
import { UiGameConfig } from "../YGOUiController";
import { removeFocusFromActiveElement } from "../../scripts/utils";

export function ControlsMenu({ duel, isMobile, isPortrait, config: gameConfig }: { duel: YGODuel, config: UiGameConfig, isMobile: boolean, isPortrait: boolean, }) {
    const isPlaying = duel.commands.isPlaying();
    const hasPrevCommand = duel.ygo.hasPrevCommand();
    const hasNextCommand = duel.ygo.hasNextCommand();

    const prev = () => {
        duel.commands.previousCommand();
    };

    const next = () => {
        duel.commands.nextCommand();
    };

    const play = () => {
        duel.commands.play();
    };

    const pause = () => {
        duel.commands.pause();
    };

    const setTimeScale = useCallback((dt: number) => {
        duel.settings.setGameSpeed(dt);
    }, [])

    useEffect(() => {
        removeFocusFromActiveElement();

        if (isMobile && isPortrait) return;

        if (!gameConfig.startReplay && duel.settings.getConfigFromPath("autoStartReplay") === true) {
            duel.events.dispatch("update-game-ui-config", { startReplay: true });
            let timer = setTimeout(() => {
                play();
            }, 500);
            return () => {
                clearTimeout(timer);
            }
        }
    }, []);

    return <div className="ygo-card-menu ygo-controls-menu">
        <div className="">
            Controls
        </div>

        <div className="ygo-flex ygo-gap-1 ygo-pb-4">
            <button disabled={duel.core.timeScale === 1} type="button" className="ygo-card-item ygo-px-0" onClick={() => setTimeScale(1)}>
                1x
            </button>
            <button disabled={duel.core.timeScale === 1.5} type="button" className="ygo-card-item ygo-px-0" onClick={() => setTimeScale(1.5)}>
                1.5x
            </button>
            <button disabled={duel.core.timeScale === 2} type="button" className="ygo-card-item ygo-px-0" onClick={() => setTimeScale(2)}>
                2x
            </button>
            <button disabled={duel.core.timeScale === 3} type="button" className="ygo-card-item ygo-px-0" onClick={() => setTimeScale(3)}>
                3x
            </button>
        </div>

        <button disabled={!hasNextCommand} type="button" className="ygo-card-item" onClick={isPlaying ? pause : play}>
            {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="ygo-flex ygo-gap-1">
            <button disabled={!hasPrevCommand} type="button" className="ygo-card-item" onClick={prev}>
                Prev
            </button>
            <button disabled={!hasNextCommand} type="button" className="ygo-card-item" onClick={next}>
                Next
            </button>
        </div>
    </div>
}