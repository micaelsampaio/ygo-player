
import { useEffect,useState } from 'react'
import { YGOPlayerComponent, YGODuel } from '../../dist';
import { useLocation } from 'react-router-dom';
import { useKaibaNet } from './useKaibaNet';

//import { YGODuel, JSONCommand } from '../../dist';

export default function Duel() {
  const [duelData, setDuelData] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>("");
  const kaibaNet = useKaibaNet();
  const location = useLocation();
  
  useEffect(() => {
    // Get data from location state or localStorage
    const newDuelData = location.state?.duelDataProp || JSON.parse(localStorage.getItem("duel-data") || "null");
    const newRoomId = location.state?.roomIdProp || "";

    if (!newDuelData) {
      console.error("No duel data found");
      return;
    }

    setDuelData(newDuelData);
    setRoomId(newRoomId);
  }, [location]);

  // Setup YGO player after duel data is available
  useEffect(() => {
    if (!duelData) return;

    const ygo = document.querySelector("ygo-player") as typeof YGOPlayerComponent;
    console.log("duelData", duelData);
    console.log("roomId", roomId);

    if (duelData.replay) {
      const config: any = {
        decks: duelData.players,
        replay: duelData.replay,
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
      };

      ygo.replay(config);
    } else {
      const config: any = {
        players: duelData.players,
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
        commands: duelData.commands,
        options: duelData.options || {}
      };

      ygo.editor(config);
    }
  }, [duelData]);

  // Handle player join events
  useEffect(() => {
    if (!duelData || !roomId) return;  // Only setup listener when we have both duelData and roomId

    const handlePlayerJoin = (playerJoinedId: string) => {
      console.log('Player joined:', playerJoinedId);
      // the room owner sends duel data to the player that joined the room
      if (kaibaNet.getPlayerId() === roomId) {
        console.log('Duel data:', duelData);
        kaibaNet.refreshGameState(roomId, duelData);
      }
    };

    kaibaNet.on('duel:player:join:', handlePlayerJoin);

    return () => {
      kaibaNet.off('duel:player:join:', handlePlayerJoin);
    };
  }, [duelData, roomId, kaibaNet]);

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
