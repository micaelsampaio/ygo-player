import { useEffect } from 'react';
import { registerYGOWebComponents, type YGOPlayerComponent } from '../../src/YGOPlayer/web';
import type { DuelData } from './hooks/useStorageDuel';
import { LocalStorage } from './scripts/storage';
import { useNavigate } from 'react-router-dom';
import "../../src/YGOPlayer/style/style.css";

registerYGOWebComponents();

export default function DuelPage() {
  const navigate = useNavigate();

  const startDuel = () => {
    const ygo = document.querySelector<YGOPlayerComponent>("ygo-player")!;
    const duelData = LocalStorage.get<DuelData | any>("duel_data");

    if (window.ygoSocketClient) {
      ygo.connectToServer({ client: window.ygoSocketClient as any, cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL) });
      return
    }

    if (!duelData || Object.keys(duelData).length === 0) {
      alert("no duel data");
      navigate("/");
      return;
    }

    if (duelData.gameMode === "REPLAY") {
      const config: any = {
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
        decks: duelData.decks,
        replay: duelData.replay,
        actions: {
          saveReplay: () => { },
          reportBug: () => { }
        }
      };

      console.log("TCL:: OPTIONS REPLAY", config);

      ygo.replay(config);
    } else {
      const config: any = {
        players: duelData.players,
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
        commands: duelData.commands,
        gameMode: duelData.gameMode,
        options: duelData.options || {},
        actions: {
          saveReplay: () => { },
          reportBug: () => { }
        }
      };

      console.log("TCL:: OPTIONS", config);

      ygo.editor(config);
    }


  }

  useEffect(() => {
    startDuel();
  })

  return <div
    style={{
      width: "100%",
      height: "100dvh",
      overflow: "hidden",
      position: "fixed",
    }}
  >
    {/* @ts-ignore */}
    <ygo-player />
  </div>
}