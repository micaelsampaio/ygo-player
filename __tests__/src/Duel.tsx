import { useEffect, useState, useMemo } from "react";
import { YGOPlayerComponent, YGODuel } from "../../dist";
import { useLocation, useParams } from "react-router-dom";
import { useKaibaNet } from "./useKaibaNet";
import Chat from "./Chat";

interface DuelProps {
  roomId?: string;
  playerId?: string;
}

export default function Duel({ roomId: roomIdProp, playerId: playerIdProp }: DuelProps) {
  const kaibaNet = useKaibaNet();
  const [isLoading, setIsLoading] = useState(true);
  const [duelData, setDuelData] = useState<any>(null);
  const [messages, setMessages] = useState<string[]>([]);
  
  const location = useLocation();
  const { roomId: urlRoomId } = useParams();

  // Derive room and player IDs using a single source of truth
  const roomId = useMemo(() => {
    // Priority: prop > location state > URL param > empty string
    return roomIdProp ?? location.state?.roomId ?? urlRoomId ?? "";
  }, [roomIdProp, location.state?.roomId, urlRoomId]);

  const playerId = useMemo(() => {
    // Priority: prop > location state > empty string
    return playerIdProp ?? location.state?.playerId ?? "";
  }, [playerIdProp, location.state?.playerId]);

  // Log changes to IDs
  useEffect(() => {
    console.log('Duel:Room ID changed:', roomId);
  }, [roomId]);

  useEffect(() => {
    console.log('Duel:Player ID changed:', playerId);
  }, [playerId]);

  // Log changes to final values
  useEffect(() => {
    console.log('Duel:Room ID changed:', roomId);
  }, [roomId]);

  useEffect(() => {
    console.log('Duel:Player ID changed:', playerId);
  }, [playerId]);

  // Initialize duel data
  useEffect(() => {
    // Initialize duel data
    const newDuelData = location.state?.duelData ?? 
      JSON.parse(localStorage.getItem("duel-data") || "null");

    if (newDuelData) {
      setDuelData(newDuelData);
      setIsLoading(false);
    }

    // If we came from URL parameter and don't have data, join the room
    if (urlRoomId && !newDuelData) {
      //kaibaNet.joinRoom(urlRoomId);
    }
  }, [location.state?.duelData, urlRoomId, kaibaNet])

  // Setup YGO player after duel data is available
  useEffect(() => {
    if (!duelData) return;
    console.log("TCL: Duel: Setting up YGO player with data:", duelData);

    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;
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
    let SEND_COMMAND_ALLOWED = true;
    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;

    ygo.on("start", () => {
      const handleCommandExecuted = (data: any) => {
        console.log(
          "TCL: SEND COMMAND ",
          JSON.stringify(data.command.toJSON())
        );
        if (SEND_COMMAND_ALLOWED) {
          kaibaNet.execYGOCommand(roomId, data.command.toCommandData());
        }
      };
      setTimeout(() => {
        ygo.on("command-executed", handleCommandExecuted);
      }, 1000);
    });

    console.log("Setting up game state refresh listener. RoomId:", roomId);

    const handleGameStateRefresh = (gameState: any) => {
      console.log("Duel: Received game state refresh:", gameState);
      setDuelData((prevData: any) => {
        console.log("Duel: Updating duel data", { prevData, gameState });
        return {
          ...prevData,
          ...gameState,
        };
      });
      setIsLoading(false);
    };

    const handleCommandExec = (command: any) => {
      console.log("TCL: Received a command to EXEC ", command);
      const ygoCore = ygo.duel.ygo;
      const commands = ygoCore.commands;

      if (commands.length > 0) {
        const currentCommand = commands.find(
          (c: any) => c.commandId === command.commandId
        );
        if (currentCommand) return;
      }
      console.log("TCL: WILL EXEC ", command);
      SEND_COMMAND_ALLOWED = false;
      ygo.duel.execCommand(JSON.stringify(command));
      SEND_COMMAND_ALLOWED = true;
    };

    // Add this log to verify the event is being subscribed
    console.log("Subscribing to duel:refresh:state: event");
    kaibaNet.on("duel:refresh:state:", handleGameStateRefresh);

    kaibaNet.on("duel:command:exec", handleCommandExec);

    return () => {
      console.log("Cleaning up game state refresh listener");
      kaibaNet.off("duel:refresh:state:", handleGameStateRefresh);
      kaibaNet.off("duel:command:exec", handleCommandExec);
    };
  }, [roomId, kaibaNet]);

  // Handle player join events
  useEffect(() => {
    if (!duelData || !roomId) return;

    const handlePlayerJoin = (playerJoinedId: string) => {
      console.log("Player joined:", playerJoinedId);
      if (kaibaNet.getPlayerId() === roomId) {
        const ygo: YGOPlayerComponent = document.querySelector(
          "ygo-player"
        )! as any;
        const currentDuelState = ygo.duel.ygo.getCurrentStateProps();
        console.log("Duel data: ", currentDuelState);

        kaibaNet.refreshGameState(roomId, currentDuelState);
      }
    };

    kaibaNet.on("duel:player:join:", handlePlayerJoin);

    return () => {
      kaibaNet.off("duel:player:join:", handlePlayerJoin);
    };
  }, [duelData, roomId, kaibaNet]);

  // Add chat message listener
  useEffect(() => {
    if (!kaibaNet) return;

    const handleChatMessage = (message: string) => {
      setMessages(prev => [...prev, message]);
    };

    kaibaNet.on("duel:chat:message", handleChatMessage);

    return () => {
      kaibaNet.off("duel:chat:message", handleChatMessage);
    };
  }, [kaibaNet]);

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

  const handleSendMessage = (message: string) => {
    if (!roomId) {
      console.warn('Cannot send message: No room ID');
      return;
    }
    kaibaNet.sendMessage(roomId, `${playerId}: ${message}`);
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
      {/* @ts-ignore */}
      <ygo-player />

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

      {console.log('Duel rendering Chat with:', { roomId, playerId })}
      <Chat 
        roomId={roomId} 
        playerId={playerId} 
        messages={messages}
        sendMessageCallback={handleSendMessage}
      />

      <div
        style={{ position: "fixed", top: "10px", right: "10px", zIndex: 9999 }}
      >
        <button onClick={saveReplay}>Save Replay</button>
      </div>
    </div>
  );
}
