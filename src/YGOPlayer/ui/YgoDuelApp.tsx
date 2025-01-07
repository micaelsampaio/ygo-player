import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { YGOUiController } from "./YGOUiController";
import "../style/style.css";

export function YgoDuelApp() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ygo, setYGO] = useState<YGODuel>();

    useEffect(() => {
        if (!canvasRef.current) return;

        const init = async () => {
            const ygo = new YGODuel({
                canvas: canvasRef.current
            });
            await ygo.load();
            setYGO(ygo);
        }

        init();
    }, [])

    useEffect(() => {
        if (!ygo) return;
        ygo.startDuel();
    }, [ygo])

    return <div className="ygo-player-core" id="ygo-player-core" {...ygo?.mouseEvents.eventsReference}>
        <canvas id='ygo-canvas' ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        </canvas>

        {ygo && <YGOUiController duel={ygo}></YGOUiController>}
    </div>
}