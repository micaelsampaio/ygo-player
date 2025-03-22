import { useEffect, useState, useMemo } from "react";
import { YGOPlayerComponent, YGODuel } from "../../dist";
import { useLocation, useParams } from "react-router-dom";
import { useKaibaNet } from "./hooks/useKaibaNet";
import Chat from "./components/Chat";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { Logger } from "./utils/logger";

interface DuelProps {
  roomId?: string;
  playerId?: string;
}

let SEND_COMMAND_ALLOWED = true;

const logger = Logger.createLogger("Duel");

export default function Duel({
  roomId: roomIdProp,
  playerId: playerIdProp,
}: DuelProps) {
  const kaibaNet = useKaibaNet();
  const [isLoading, setIsLoading] = useState(true);
  const [duelData, setDuelData] = useState<any>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

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
    logger.info("Room ID changed:", roomId);
  }, [roomId]);

  useEffect(() => {
    logger.info("Player ID changed:", playerId);
  }, [playerId]);

  // Log changes to final values
  useEffect(() => {
    logger.info("Room ID changed:", roomId);
  }, [roomId]);

  useEffect(() => {
    logger.info("Player ID changed:", playerId);
  }, [playerId]);

  // Initialize duel data
  useEffect(() => {
    // Initialize duel data
    const newDuelData =
      location.state?.duelData ??
      JSON.parse(localStorage.getItem("duel-data") || "null");

    if (newDuelData) {
      setDuelData(newDuelData);
      setIsLoading(false);
    }

    // If we came from URL parameter and don't have data, join the room
    if (urlRoomId && !newDuelData) {
      //kaibaNet.joinRoom(urlRoomId);
    }
  }, [location.state?.duelData, urlRoomId, kaibaNet]);

  // Setup YGO player after duel data is available
  useEffect(() => {
    if (!duelData) return;
    logger.debug("Setting up YGO player with data:", duelData);

    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;
    logger.debug("duelData", duelData);
    logger.debug("roomId", roomId);

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
      logger.debug("No roomId yet, skipping game state refresh listener setup");
      return;
    }

    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;

    const formatCommandToCliStyle = (command: any): string => {
      const { type, data } = command;
      // Convert type from CamelCase to lowercase
      const commandType = type.replace("Command", "");

      // Convert data object to CLI options
      const options = Object.entries(data)
        .map(([key, value]) => `--${key} ${value}`)
        .join(" ");

      return `/cmd/${commandType} ${options}`;
    };

    const handleCommandExecuted = (data: any) => {
      logger.debug("SEND COMMAND ", JSON.stringify(data.command.toJSON()));
      if (SEND_COMMAND_ALLOWED) {
        kaibaNet.execYGOCommand(roomId, data.command.toCommandData());
        const messageTemplate = formatCommandToCliStyle(data.command.toJSON());
        const { commandMessage } = commandMessageToCommand(messageTemplate);
        // Show command message in chat
        handleChatMessage(commandMessage);
      }
    };

    ygo.on("start", () => {
      setTimeout(() => {
        ygo.on("command-executed", handleCommandExecuted);
      }, 1000);
    });

    logger.debug("Setting up game state refresh listener. RoomId:", roomId);

    const handleGameStateRefresh = (gameState: any) => {
      logger.debug("Received game state refresh:", gameState);
      setDuelData((prevData: any) => {
        logger.debug("Updating duel data", { prevData, gameState });
        return {
          ...prevData,
          ...gameState,
        };
      });
      setIsLoading(false);
    };

    // Add this log to verify the event is being subscribed
    logger.debug("Subscribing to duel:refresh:state: event");
    kaibaNet.on("duel:refresh:state:", handleGameStateRefresh);

    kaibaNet.on("duel:command:exec", handleCommandExec);

    return () => {
      logger.debug("Cleaning up game state refresh listener");
      kaibaNet.off("duel:refresh:state:", handleGameStateRefresh);
      kaibaNet.off("duel:command:exec", handleCommandExec);
    };
  }, [roomId, kaibaNet]);

  // Handle player join events
  useEffect(() => {
    if (!duelData || !roomId) return;

    const handlePlayerJoin = (playerJoinedId: string) => {
      logger.debug("Player joined:", playerJoinedId);
      if (kaibaNet.getPlayerId() === roomId) {
        const ygo: YGOPlayerComponent = document.querySelector(
          "ygo-player"
        )! as any;
        const currentDuelState = ygo.duel.ygo.getCurrentStateProps();
        logger.debug("Duel data: ", currentDuelState);

        kaibaNet.refreshGameState(roomId, currentDuelState);
      }
    };

    kaibaNet.on("duel:player:join:", handlePlayerJoin);

    return () => {
      kaibaNet.off("duel:player:join:", handlePlayerJoin);
    };
  }, [duelData, roomId, kaibaNet]);

  const handleChatMessage = (message: string) => {
    setMessages((prev) => [...prev, message]);
  };

  // Add chat message listener
  useEffect(() => {
    if (!kaibaNet) return;
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

  const commandMessageToCommand = (message: string) => {
    if (!message.startsWith("/cmd/")) {
      logger.warn("Invalid command message format");
      return;
    }
    const [commandType, ...args] = message.split(" ");
    const options: Record<string, any> = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith("--")) {
        const key = args[i].slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith("--")) {
          options[key] = !isNaN(Number(value)) ? Number(value) : value;
          i++;
        }
      }
    }
    const command = {
      type: `${commandType.split("/cmd/")[1]}Command`,
      data: options,
    };

    const commandMessage = `${playerId}:${commandType} ${JSON.stringify(
      options
    )}`;
    return { commandMessage, command };
  };

  const handleCommandExec = (command: any) => {
    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;
    const ygoCore = ygo.duel.ygo;
    const commands = ygoCore.commands;

    if (commands.length > 0) {
      const currentCommand = commands.find(
        (c: any) => c.commandId === command.commandId
      );
      if (currentCommand) return;
    }

    logger.debug("WILL EXEC ", command);
    SEND_COMMAND_ALLOWED = false;
    ygo.duel.execCommand(JSON.stringify(command));
    SEND_COMMAND_ALLOWED = true;
  };

  const handleSendMessage = (message: string) => {
    if (!roomId) {
      logger.warn("Cannot send message: No room ID");
      return;
    }

    if (message.startsWith("/cmd/")) {
      const { command, commandMessage } = commandMessageToCommand(message);
      // Show command message in chat
      handleChatMessage(commandMessage);
      // Execute the command
      handleCommandExec(command);
      return;
    }

    // Regular message
    const messageTemplate = `${playerId}: ${message}`;
    handleChatMessage(messageTemplate);
    kaibaNet.sendMessage(roomId, messageTemplate);
  };

  const handleVoiceChatToggle = async (enabled: boolean) => {
    if (!roomId || !kaibaNet) return;

    try {
      if (enabled) {
        logger.debug("Starting voice chat...");
        await kaibaNet.startVoiceChat(roomId);
        const audioAnalyser = kaibaNet.getAudioAnalyser();
        logger.debug("Voice chat started, analyser:", !!audioAnalyser);
        setAnalyser(audioAnalyser);
        setIsVoiceEnabled(enabled);
      } else {
        logger.debug("Stopping voice chat...");
        await kaibaNet.stopVoiceChat(roomId);
        setAnalyser(null);
        setIsVoiceEnabled(false);
      }
    } catch (error) {
      logger.error("Voice chat error:", error);
      setIsVoiceEnabled(false);
      setAnalyser(null);
    }
  };

  const handleMicMuteToggle = (muted: boolean) => {
    if (!kaibaNet) return;
    kaibaNet.setMicMuted(muted);
  };

  const handleAudioMuteToggle = (muted: boolean) => {
    if (!kaibaNet) return;
    kaibaNet.setPlaybackMuted(muted);
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
      <ygo-player />
      {isLoading && !duelData && <LoadingOverlay />}
      <Chat
        roomId={roomId}
        playerId={playerId}
        messages={messages}
        onSendMessage={handleSendMessage}
        onVoiceChatToggle={handleVoiceChatToggle}
        onMicMuteToggle={handleMicMuteToggle}
        onAudioMuteToggle={handleAudioMuteToggle}
        analyser={analyser}
      />
      <div
        style={{ position: "fixed", top: "10px", right: "10px", zIndex: 9999 }}
      >
        <button onClick={saveReplay}>Save Replay</button>
      </div>
    </div>
  );
}
