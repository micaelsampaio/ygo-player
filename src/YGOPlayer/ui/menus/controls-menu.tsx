import { useCallback, useEffect } from "react";
import { YGODuel } from "../../core/YGODuel";
import { removeFocusFromActiveElement } from "../../scripts/utils";
import { YGOCommandsControllerState } from "../../core/components/commands-controller/YGOCommandsController";

export function ControlsMenu({ duel }: { duel: YGODuel }) {
    const isPlaying = duel.commands.getState() === YGOCommandsControllerState.PLAYING;
    const hasPrevCommand = duel.ygo.hasPrevCommand();
    const hasNextCommand = duel.ygo.hasNextCommand();

    const prev = () => {
        duel.serverActions.controls.previousCommand();
    };

    const next = () => {
        duel.serverActions.controls.nextCommand();
    };

    const play = () => {
        duel.serverActions.controls.play();
    };

    const pause = () => {
        duel.serverActions.controls.pause();
    };

    const setTimeScale = useCallback((dt: number) => {
        duel.settings.setGameSpeed(dt);
    }, [])

    useEffect(() => {
        removeFocusFromActiveElement();
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