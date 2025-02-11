
import { useEffect } from 'react'
import { YGOPlayerComponent } from "../../dist";


export default function Duel() {

  useEffect(() => {

    const duelData = JSON.parse(window.localStorage.getItem("duel-data")!);

    const ygo = document.querySelector("ygo-player") as YGOPlayerComponent;
    console.log("YGO player2", ygo.editor);

    if (duelData.replay) {
      const config: any = {
        decks: duelData.players,
        replay: duelData.replay,
      };

      ygo.replay(config);
    } else {
      const config: any = {
        players: duelData.players,
      };

      ygo.editor(config);
    }


  }, [])

  const saveReplay = () => {
    const duel = (window as any).YGODuel;
    if (!duel) return alert("no duel");
    const duelData = JSON.parse(window.localStorage.getItem("duel-data")!);
    const replay = duel.ygo.getReplayData();

    const replayName = prompt("Give name to the replay", "")!.replace(/[^a-zA-Z ]/g, '').replace(/ /g, '-') as string;
    const replayData = {
      players: duelData.players,
      replay
    }

    window.localStorage.setItem(`replay_${replayName}_${Date.now()}`, JSON.stringify(replayData));
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 9999 }}><button onClick={saveReplay}>Save Replay</button></div>

      {/* @ts-ignore */}
      <ygo-player />
    </div>
  )
}
