import { useEffect, useState, useMemo } from "react";
import { YGOPlayerComponent } from "../../dist";
import { useLocation, useParams } from "react-router-dom";
import { useKaibaNet } from "./hooks/useKaibaNet";
import Chat from "./components/Chat/Chat";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { Logger } from "./utils/logger";
import { StoreService } from "./services/store-service";

interface DuelProps {
  roomId?: string;
  playerId?: string;
}

let SEND_COMMAND_ALLOWED = true;

const logger = Logger.createLogger("Duel");

enum DUEL_VIEW {
  DUEL,
  END_DUEL
}
export default function Duel({
  roomId: roomIdProp,
  playerId: playerIdProp,
}: DuelProps) {
  const kaibaNet = useKaibaNet();
  const [VIEW, setView] = useState<DUEL_VIEW>(DUEL_VIEW.DUEL);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Initializing duel...");
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>(
    undefined
  );
  const [duelData, setDuelData] = useState<any>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [ygoInitialized, setYgoInitialized] = useState(false);

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

  // Initialize duel data
  useEffect(() => {
    setLoadingStatus("Finding duel data...");

    // Initialize duel data
    const newDuelData =
      location.state?.duelData ??
      JSON.parse(localStorage.getItem("duel-data") || "null");

    if (newDuelData) {
      setDuelData(newDuelData);
      setLoadingStatus("Duel data loaded, preparing game...");
      setLoadingProgress(30);
    } else {
      setLoadingStatus("Waiting for game state from host...");
    }

    // If we came from URL parameter and don't have data, join the room
    if (urlRoomId && !newDuelData) {
      setLoadingStatus(`Joining room ${urlRoomId}...`);
      setLoadingProgress(10);
      //kaibaNet.joinRoom(urlRoomId);
    }
  }, [location.state?.duelData, urlRoomId, kaibaNet]);

  // Setup YGO player after duel data is available
  useEffect(() => {
    if (!duelData) return;

    setLoadingStatus("Setting up game environment...");
    setLoadingProgress(50);

    logger.debug("Setting up YGO player with data:", duelData);

    const ygo: YGOPlayerComponent = document.querySelector(
      "ygo-player"
    )! as any;
    logger.debug("duelData", duelData);
    logger.debug("roomId", roomId);

    if (duelData.replay) {
      setLoadingStatus("Loading replay data...");
      setLoadingProgress(60);

      const config: any = {
        decks: duelData.players,
        replay: duelData.replay,
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
      };

      ygo.replay(config);

      // For replays, we don't need to wait for other players
      setTimeout(() => {
        setLoadingProgress(100);
        setIsLoading(false);
      }, 1000);
    } else {
      setLoadingStatus("Setting up duel...");
      setLoadingProgress(60);

      const config: any = {
        players: duelData.players,
        cdnUrl: String(import.meta.env.VITE_YGO_CDN_URL),
        commands: duelData.commands,
        options: duelData.options || {},
        actions: {
          saveReplay
        }
      };

      console.log("TCL:: OPTIONS", config);

      ygo.editor(config);

      // For multiplayer duels, we'll handle loading state in the player ready events
      setYgoInitialized(true);
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
        const { commandMessage } = commandMessageToCommand(
          messageTemplate
        ) as any;
        // Show command message in chat
        handleChatMessage(commandMessage);
      }
    };

    ygo.on("start", () => {
      logger.debug("YGO player started");
      setLoadingStatus("Game starting...");
      setLoadingProgress(80);

      setTimeout(() => {
        ygo.on("command-executed", handleCommandExecuted);
      }, 1000);
    });

    logger.debug("Setting up game state refresh listener. RoomId:", roomId);

    const handleGameStateRefresh = (gameState: any) => {
      logger.debug("Received game state refresh:", gameState);
      setLoadingStatus("Game state received, finalizing setup...");
      setLoadingProgress(90);

      setDuelData((prevData: any) => {
        logger.debug("Updating duel data", { prevData, gameState });
        return {
          ...prevData,
          ...gameState,
        };
      });

      // After receiving game state, we still need to wait for player ready events
      if (kaibaNet.getPlayerId() !== roomId) {
        // If we're not the host, we can remove the loading overlay after getting game state
        setTimeout(() => {
          setLoadingStatus("Duel ready!");
          setLoadingProgress(100);
          setIsLoading(false);
        }, 1000);
      }
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

  // Handle player join events and ready state
  useEffect(() => {
    if (!duelData || !roomId) return;

    // Check if we're in offline mode
    const isOfflineMode =
      location.state?.offline || kaibaNet.getCommunicationType() === "offline";

    // In offline mode, we don't need to wait for other players
    if (isOfflineMode) {
      logger.debug("Running in offline mode, skipping player ready checks");
      // Remove loading overlay immediately
      setTimeout(() => {
        setLoadingStatus("Offline duel ready!");
        setLoadingProgress(100);
        setIsLoading(false);
      }, 1000);
      return; // Skip setting up network listeners
    }

    // Online mode logic below
    // Track players who have joined but aren't ready yet
    const pendingPlayers = new Set<string>();

    const handlePlayerJoin = (playerJoinedId: string) => {
      logger.debug("Player joined:", playerJoinedId);

      if (kaibaNet.getPlayerId() === roomId) {
        // If we're the host and another player joins
        setLoadingStatus(
          `Player ${playerJoinedId} joined, waiting for them to be ready...`
        );
      }

      // Track that this player joined but may not be ready yet
      if (playerJoinedId !== kaibaNet.getPlayerId()) {
        pendingPlayers.add(playerJoinedId);
        logger.debug(
          "Adding to pending players:",
          playerJoinedId,
          pendingPlayers
        );
      }
    };

    const handlePlayerReady = (playerReadyId: string) => {
      logger.debug("Player ready:", playerReadyId);

      if (kaibaNet.getPlayerId() === roomId) {
        setLoadingStatus(`Player ${playerReadyId} is ready!`);
        setLoadingProgress((current) =>
          current ? Math.min(95, current + 10) : 70
        );
      }

      // Remove from pending when they're ready
      if (pendingPlayers.has(playerReadyId)) {
        pendingPlayers.delete(playerReadyId);
        logger.debug("Removed from pending:", playerReadyId, pendingPlayers);
      }
    };

    const handleAllPlayersReady = () => {
      logger.debug("All players ready event received");
      setLoadingStatus("All players ready, starting duel...");
      setLoadingProgress(95);

      // Only the room creator (host) should send the game state
      if (kaibaNet.getPlayerId() === roomId) {
        logger.debug("I am the host, sending current game state");
        const ygo: YGOPlayerComponent = document.querySelector(
          "ygo-player"
        )! as any;
        const currentDuelState = ygo.duel.ygo.getCurrentStateProps();
        logger.debug("Refreshing with duel state:", currentDuelState);

        // Add a small delay to ensure all clients are ready to receive the state
        setTimeout(() => {
          kaibaNet.refreshGameState(roomId, currentDuelState);

          // After sending the game state as host, we can remove the loading overlay
          setTimeout(() => {
            setLoadingStatus("Duel ready!");
            setLoadingProgress(100);
            setIsLoading(false);
          }, 1000);
        }, 500);
      }
    };

    kaibaNet.on("duel:player:join:", handlePlayerJoin);
    kaibaNet.on("duel:player:ready:", handlePlayerReady);
    kaibaNet.on("duel:all_players_ready", handleAllPlayersReady);

    return () => {
      kaibaNet.off("duel:player:join:", handlePlayerJoin);
      kaibaNet.off("duel:player:ready:", handlePlayerReady);
      kaibaNet.off("duel:all_players_ready", handleAllPlayersReady);
    };
  }, [duelData, roomId, kaibaNet, location.state?.offline]);

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

  const saveReplay = async (replayData: any) => {
    try {
      const deckId = duelData.players[0].deckId;

      if (deckId) {
        replayData.players[0].deckId = deckId;
      }

      await StoreService.saveReplay(replayData);

      const ygo: YGOPlayerComponent = document.querySelector(
        "ygo-player"
      )! as any;

      ygo.destroy();

      setView(DUEL_VIEW.END_DUEL);

    } catch (error) {
      console.log(error);
    }


    // const duel = (window as any).YGODuel;
    // if (!duel) return alert("no duel");
    // const duelData = JSON.parse(window.localStorage.getItem("duel-data")!);
    // const replay = duel.ygo.getReplayData();

    // const replayName = prompt("Give name to the replay", "")!
    //   .replace(/[^a-zA-Z ]/g, "")
    //   .replace(/ /g, "-") as string;
    // const replayData = {
    //   players: duelData.players,
    //   replay,
    // };

    // window.localStorage.setItem(
    //   `replay_${replayName}_${Date.now()}`,
    //   JSON.stringify(replayData)
    // );
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
      const { command, commandMessage } = commandMessageToCommand(
        message
      ) as any;
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

  if (VIEW === DUEL_VIEW.END_DUEL) {
    return <>
      <h1>DUEL is over close this tab</h1>
    </>
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        position: "fixed",
      }}
    >
      {/* @ts-ignore */}
      <ygo-player />

      {isLoading && (
        <LoadingOverlay
          statusMessage={loadingStatus}
          progress={loadingProgress}
        />
      )}
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
      {/* <div
        style={{ position: "fixed", top: "200px", right: "10px", zIndex: 4 }}
      >
        <button className="btn-btn-action" onClick={saveReplay}>Save Replay</button>
      </div> */}
    </div>
  );
}
