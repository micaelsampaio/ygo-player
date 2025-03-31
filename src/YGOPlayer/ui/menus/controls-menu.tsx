import { useRef } from "react";
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

    return <div className="ygo-card-menu ygo-controls-menu">
        <div className="">
            Controls
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