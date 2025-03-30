import { useRef } from "react";
import { YGODuel } from "../../core/YGODuel";

export function ControlsMenu({ duel }: { duel: YGODuel }) {
    const pauseCommandRef = useRef(false);

    const isPlaying = duel.commands.isPlaying();
    const hasPrevCommand = duel.ygo.hasPrevCommand();
    const hasNextCommand = duel.ygo.hasNextCommand();

    const prev = () => {
        if (duel.commands.isLocked()) return;
        duel.commands.startRecover();

        if (duel.ygo.hasPrevCommand()) {
            duel.ygo.undo();
        }

        duel.updateField();
        duel.commands.endRecover();
    };

    const next = () => {
        if (duel.commands.isLocked()) return;

        if (duel.ygo.hasNextCommand()) {
            duel.commands.playNextCommand();
            duel.ygo.redo();
        }
    };

    const play = () => {
        if (duel.commands.isPlaying()) return;

        duel.commands.play();

        const nextEvent = () => {
            if (!duel.commands.isPlaying()) return;

            if (pauseCommandRef.current) {
                pauseCommandRef.current = false;
                duel.commands.pause();
                return;
            }

            if (duel.ygo.hasNextCommand()) {
                setTimeout(() => duel.ygo.redo(), 500);
            } else {
                duel.commands.pause();
                duel.events.off("commands-process-completed", nextEvent);
            }
        };

        duel.events.on("commands-process-completed", nextEvent);

        nextEvent();
    };

    const pause = () => {
        if (duel.commands.isPlaying()) pauseCommandRef.current = true;
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