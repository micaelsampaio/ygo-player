import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../core/YGODuel";
import { YGOUiController } from "./YGOUiController";
import { YGOConfig } from "../core/YGOConfig";
import { useDeviceResolutionInfo } from "../scripts/use-device-resolution-info";
import { YGOClient } from "ygo-core";

export function YgoDuelApp({ config, client, bind: onBind, start: onStart }: { client: YGOClient, bind?: (duel: YGODuel) => void, config: YGOConfig, start?: (duel: YGODuel) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [duel, setDuel] = useState<YGODuel>();
    const { isMobile } = useDeviceResolutionInfo();

    useEffect(() => {
        if (!canvasRef.current) return;

        let duel: YGODuel | undefined;
        let destroyed = false;
        const init = async () => {
            duel = new YGODuel({ canvas: canvasRef.current!, client, config });
            await duel.load();
            // The web component's connectToServer()/editor()/replay() re-render
            // this SAME React root with a fresh client/config for a brand new
            // duel — since load() is async, a second call racing in here could
            // otherwise leave this stale instance's onBind/setDuel firing after
            // the cleanup below already destroyed it.
            if (destroyed) { duel.destroyDuelInstance(); return; }
            if (onBind) onBind(duel);
            setDuel(duel);
        }
        init();

        return () => {
            destroyed = true;
            if (duel) duel.destroyDuelInstance();
        }
    }, [client, config])

    useEffect(() => {
        try {
            if (!duel) return;
            duel.startDuel();
            if (onStart) onStart(duel);
        } catch (error) {
            console.error("YgoDuelApp startDuel failed:", error);
        }
    }, [duel])

    return <div className={`ygo-player-core ${isMobile ? "ygo-is-mobile" : ""}`} id="ygo-player-core" {...duel?.mouseEvents.eventsReference}>
        <canvas id='ygo-canvas' ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        </canvas>
        {duel && <YGOUiController duel={duel}></YGOUiController>}
    </div>
}