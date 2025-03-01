import { useEffect, useState } from "react";
import { YGOPlayerComponent, YGODuel } from "../../dist";
import { useLocation,useParams } from "react-router-dom";
import { useKaibaNet } from "./useKaibaNet";

export default function Duel() {
  const [duelData, setDuelData] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const kaibaNet = useKaibaNet();
  const location = useLocation();
  const { roomId: urlRoomId } = useParams();

  // Initialize duel data and room ID
  useEffect(() => {
    const newDuelData =
      location.state?.duelDataProp ||
      JSON.parse(localStorage.getItem("duel-data") || "null");
    const newRoomId = location.state?.roomIdProp || urlRoomId || "";

    if (newDuelData) {
      setDuelData(newDuelData);
      setIsLoading(false);
    }
    if (newRoomId) {
      console.log("newRoomId:", newRoomId);
      setRoomId(newRoomId);

      // If we came from URL parameter and don't have data, join the room
      if (urlRoomId && !location.state?.duelDataProp) {
        kaibaNet.joinRoom(newRoomId);
      }
    }
  }, [location, urlRoomId, kaibaNet]);

  // Setup YGO player after duel data is available
  useEffect(() => {
    if (!duelData) return;
    console.log("Duel: Setting up YGO player with data:", duelData);

    const ygo = document.querySelector(
      "ygo-player"
    ) as typeof YGOPlayerComponent;
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
        options: duelData.options || {},
      };

      ygo.editor(config);
    }
  }, [duelData]);

  // Handle game state refresh events
  useEffect(() => {
    if (!roomId) {
      console.log("No roomId yet, skipping game state refresh listener setup");
      return;
    }

    console.log("Setting up game state refresh listener. RoomId:", roomId);

    const handleGameStateRefresh = (gameState: any) => {
      console.log("Duel: Received game state refresh:", gameState);
      setDuelData((prevData) => {
        console.log("Duel: Updating duel data", { prevData, gameState });
        return {
          ...prevData,
          ...gameState,
        };
      });
      setIsLoading(false);
    };

    // Add this log to verify the event is being subscribed
    console.log("Subscribing to duel:refresh:state: event");
    kaibaNet.on("duel:refresh:state:", handleGameStateRefresh);

    return () => {
      console.log("Cleaning up game state refresh listener");
      kaibaNet.off("duel:refresh:state:", handleGameStateRefresh);
    };
  }, [roomId, kaibaNet]);

  // Handle player join events
  useEffect(() => {
    if (!duelData || !roomId) return;

    const handlePlayerJoin = (playerJoinedId: string) => {
      console.log("Player joined:", playerJoinedId);
      if (kaibaNet.getPlayerId() === roomId) {
        console.log("Duel data:", duelData);
        kaibaNet.refreshGameState(roomId, duelData);
      }
    };

    kaibaNet.on("duel:player:join:", handlePlayerJoin);

    return () => {
      kaibaNet.off("duel:player:join:", handlePlayerJoin);
    };
  }, [duelData, roomId, kaibaNet]);

  const saveReplay = () => {
    const duel = (window as any).YGODuel;
    if (!duel) return alert("no duel");
    const duelData = JSON.parse(window.localStorage.getItem("duel-data")!);
    const replay = duel.ygo.getReplayData();

    const replayName = prompt("Give name to the replay", "")!
      .replace(/[^a-zA-Z ]/g, "")
      .replace(/ /g, "-") as string;
    const replayData = {
      players: duelData.players,
      replay,
    };

    window.localStorage.setItem(
      `replay_${replayName}_${Date.now()}`,
      JSON.stringify(replayData)
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Only render YGO player when we have data */}
      {duelData && (
        /* @ts-ignore */
        <ygo-player />
      )}

      {/* Show loading state when no data */}
      {isLoading && !duelData && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)", // semi-transparent overlay
            zIndex: 1000,
          }}
        >
          <div>Waiting for duel data...</div>
        </div>
      )}

      <div
        style={{ position: "fixed", top: "10px", right: "10px", zIndex: 9999 }}
      >
        <button onClick={saveReplay}>Save Replay</button>
      </div>
    </div>
  );
}
