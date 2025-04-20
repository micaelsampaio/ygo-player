import { KaibaNet } from "../network/kaibaNet";
import { Logger } from "./logger";

const logger = Logger.createLogger("RoomUtils");

export interface DuelData {
  players: {
    name: string;
    mainDeck: any[];
    extraDeck: any[];
  }[];
  options?: {
    shuffleDecks?: boolean;
    fieldState?: any[];
    [key: string]: any;
  };
}

export interface RoomNavigationState {
  roomId: string;
  duelData: DuelData;
  playerId: string | null;
  offline: boolean;
}

/**
 * Cleans previous duel data from localStorage
 * This should be called before creating or joining a room
 */
export function cleanDuelData(): void {
  logger.debug("Cleaning previous duel data");
  const keysToRemove = ["commands", "duel-data"];
  keysToRemove.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      logger.debug(`Removed ${key} from localStorage`);
    }
  });
}

/**
 * Creates a room for dueling and returns the navigation state
 * @param kaibaNet KaibaNet instance
 * @param duelData Duel data with players and options
 * @returns Navigation state for the duel page
 */
export async function createRoom(
  kaibaNet: KaibaNet,
  duelData: DuelData
): Promise<RoomNavigationState> {
  logger.debug("Creating room with duel data:", duelData);

  // Clean up any previous duel data
  cleanDuelData();

  // Store the duel data in localStorage
  localStorage.setItem("duel-data", JSON.stringify(duelData));

  // Check if we're in offline mode
  const isOffline = kaibaNet.getCommunicationType() === "offline";
  let roomId: string;

  if (isOffline) {
    // In offline mode, generate a random room ID
    roomId = `offline-room-${Date.now()}`;
    logger.debug("Running in offline mode, using generated roomId:", roomId);
  } else {
    // For online modes, create a room
    await kaibaNet.createRoom();
    roomId = kaibaNet.getPlayerId() ? kaibaNet.getPlayerId() : "";
  }

  // Return the navigation state
  return {
    roomId,
    duelData,
    playerId: kaibaNet.getPlayerId(),
    offline: isOffline,
  };
}
