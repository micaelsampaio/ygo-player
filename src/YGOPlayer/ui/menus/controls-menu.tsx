import { useCallback, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";

export function ControlsMenu({ duel }: { duel: YGODuel }) {
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
        duel.core.setTimeScale(dt);
    }, [])

    const setAudioVolume = useCallback((value: number) => {
        duel.soundController.setLayerVolume("GAME_MUSIC", value)
    }, [])
    const setAudioVolume2 = useCallback((value: number) => {
        duel.soundController.setLayerVolume("GAME", value)
    }, [])

    return <div className="ygo-card-menu ygo-controls-menu">
        <div className="">
            Controls
        </div>
        <div>
            GAME <br />
            <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" onChange={e => setAudioVolume2(Number(e.target.value))} />
        </div>
        <div>
            Music <br />
            <input type="range" id="volume" name="volume" step="0.1" min="0.0" max="1.0" onChange={e => setAudioVolume(Number(e.target.value))} />
        </div>
        <div className="ygo-flex ygo-gap-1">


            <button type="button" className="ygo-card-item" onClick={() => setAudioVolume(0.1)}>
                10
            </button>
            <button type="button" className="ygo-card-item" onClick={() => setAudioVolume(0.2)}>
                20
            </button>
            <button type="button" className="ygo-card-item" onClick={() => setAudioVolume(0.5)}>
                50
            </button>
            <button type="button" className="ygo-card-item" onClick={() => setAudioVolume(1)}>
                100
            </button>
        </div>
        <div className="ygo-flex ygo-gap-1">
            <button disabled={duel.core.timeScale === 1} type="button" className="ygo-card-item" onClick={() => setTimeScale(1)}>
                1x
            </button>
            <button disabled={duel.core.timeScale === 1.5} type="button" className="ygo-card-item" onClick={() => setTimeScale(1.5)}>
                1.5x
            </button>
            <button disabled={duel.core.timeScale === 2} type="button" className="ygo-card-item" onClick={() => setTimeScale(2)}>
                2x
            </button>
            <button disabled={duel.core.timeScale === 3} type="button" className="ygo-card-item" onClick={() => setTimeScale(3)}>
                3x
            </button>
        </div>
        <button disabled={isPlaying || !hasNextCommand} type="button" className="ygo-card-item" onClick={play}>
            Play
        </button>
        <button disabled={!isPlaying} type="button" className="ygo-card-item" onClick={pause}>
            Pause
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