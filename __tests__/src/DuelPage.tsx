import { useEffect } from 'react';
import { YGOPlayerComponent } from '../../src/YGOPlayer/web';
import type { DuelData } from './hooks/useStorageDuel';
import { LocalStorage } from './scripts/storage';
import { useNavigate } from 'react-router-dom';

import "../../src/YGOPlayer/style/style.css";

export default function DuelPage() {
  const navigate = useNavigate();

  const startDuel = () => {
    const ygo: YGOPlayerComponent = document.querySelector("ygo-player")! as any;
    const duelData = LocalStorage.get<DuelData>("duel_data");

    console.log(ygo);

    if (!duelData || Object.keys(duelData).length === 0) {
      alert("no duel data");
      navigate("/");
      return;
    }

    const config: any = {
      players: duelData.players,
      cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
      commands: duelData.commands,
      gameMode: duelData.gameMode,
      options: duelData.options || {},
      actions: {
        saveReplay: () => { }
      }
    };

    console.log("TCL:: OPTIONS", config);

    ygo.editor(config);
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