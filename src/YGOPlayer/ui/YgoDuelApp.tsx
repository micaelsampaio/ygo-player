import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { YGOUiController } from "./YGOUiController";
import { YGOConfig } from "../core/YGOConfig";

export function YgoDuelApp({ config, bind: onBind, start: onStart }: { bind?: (duel: YGODuel) => void, config: YGOConfig, start?: (duel: YGODuel) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ygo, setYGO] = useState<YGODuel>();

    useEffect(() => {
        if (!canvasRef.current) return;

        const init = async () => {
            const ygo = new YGODuel({ canvas: canvasRef.current!, config });
            if (onBind) onBind(ygo);
            await ygo.load();
            setYGO(ygo);
        }

        init();
    }, [])

    useEffect(() => {
        if (!ygo) return;
        ygo.startDuel();
        if (onStart) onStart(ygo);
    }, [ygo])

    return <div className="ygo-player-core" id="ygo-player-core" {...ygo?.mouseEvents.eventsReference}>
        <canvas id='ygo-canvas' ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        </canvas>

        {ygo && <YGOUiController duel={ygo}></YGOUiController>}
    </div>
}