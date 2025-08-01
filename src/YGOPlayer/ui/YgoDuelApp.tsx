import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { YGOUiController } from "./YGOUiController";
import { YGOConfig } from "../core/YGOConfig";
import { useDeviceResolutionInfo } from "../scripts/use-device-resolution-info";

export function YgoDuelApp({ config, bind: onBind, start: onStart }: { bind?: (duel: YGODuel) => void, config: YGOConfig, start?: (duel: YGODuel) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [duel, setDuel] = useState<YGODuel>();
    const { isMobile } = useDeviceResolutionInfo();

    useEffect(() => {
        if (!canvasRef.current) return;

        let duel: YGODuel | undefined;
        const init = async () => {
            duel = new YGODuel({ canvas: canvasRef.current!, config });
            if (onBind) onBind(duel);
            await duel.load();
            setDuel(duel);
        }
        init();

        return () => {
            if (duel) duel.destroyDuelInstance();
        }
    }, [])

    useEffect(() => {
        try {
            if (!duel) return;
            duel.startDuel();
            if (onStart) onStart(duel);
        } catch (error) {
            alert("ERROR");
        }
    }, [duel])

    return <div className={`ygo-player-core ${isMobile ? "ygo-is-mobile" : ""}`} id="ygo-player-core" {...duel?.mouseEvents.eventsReference}>
        <canvas id='ygo-canvas' ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        </canvas>
        {duel && <YGOUiController duel={duel}></YGOUiController>}
    </div>
}