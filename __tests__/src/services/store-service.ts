import { isUserLoggedIn } from "../utils/token-utils";
import { APIService } from "./api-service";

export class StoreService {
  static async getDeckById(deckId: string) {
    if (isUserLoggedIn()) {
      return APIService.getDeckById(deckId);
    } else {
      try {
        const deck = JSON.parse(window.localStorage.getItem(deckId)!);
        deck.isLocal = true;
        return deck;
      } catch (error) {
        return null;
      }
    }
  }

  static async getReplaysFromDeckId(deckId: string, signal?: any) {
    if (isUserLoggedIn()) {
      return APIService.getReplaysFromDeckId(deckId, signal);
    } else {
      try {
        const replayDeckKey = `replays_${deckId}`;
        const data = window.localStorage.getItem(replayDeckKey);

        if (!data) return [];

        const replaysData = JSON.parse(data);
        replaysData.replays.forEach((replay: any) => (replay.isLocal = true));

        return replaysData.replays;
      } catch (error) {
        return [];
      }
    }
  }

  static async getAllReplays() {
    if (isUserLoggedIn()) {
      throw new Error("not implemented");
    } else {
      try {
        const allReplaysData = getLocalStorageDataFromPrefix("replays_");
        const replays: any[] = [];

        allReplaysData.forEach((replayData) => {
          replays.push(...replayData.replays);
        });

        replays.forEach((replay) => (replay.isLocal = true));

        return replays;
      } catch (error) {
        return [];
      }
    }
  }

  static async saveReplay(replayData: any) {
    if (isUserLoggedIn()) {
      return await APIService.saveReplay(replayData);
    } else {
      const deckId = replayData.players[0].deckId;
      const replayId = replayData.replayId ?? Date.now();
      replayData.replayId = replayId;

      if (!deckId) return;

      const replayDeckKey = `replays_${deckId}`;

      const currentDeckReplaysRaw = window.localStorage.getItem(replayDeckKey);
      let replaysInStore;
      if (currentDeckReplaysRaw) {
        replaysInStore = JSON.parse(currentDeckReplaysRaw);
      } else {
        replaysInStore = {
          deckId: deckId,
          replays: [],
        };
      }

      replaysInStore.replays.push(replayData);

      window.localStorage.setItem(
        replayDeckKey,
        JSON.stringify(replaysInStore)
      );
    }
  }

  static async deleteReplay(replay: any) {
    if (isUserLoggedIn()) {
      throw new Error("not implemented");
    } else {
      try {
        if (!replay || !replay.replayId) return false;
        
        // Simply remove the replay's key from localStorage
        window.localStorage.removeItem(`replay_${replay.replayId}`);
        return true;
      } catch (error) {
        console.error("Error deleting replay:", error);
        return false;
      }
    }
  }

  static async getDeckFromDeckWithCardIds(deckId: string) {
    if (isUserLoggedIn()) {
      return await APIService.getDeckFromDeckWithCardIds(deckId);
    } else {
      return await this.getDeckById(deckId);
    }
  }
}

function getLocalStorageKeysFromPrefix(
  prefix: string,
  invalidPrefixes?: string[] | undefined
) {
  const allKeys = Object.keys(localStorage);
  const keys = allKeys.filter((key) => {
    if (invalidPrefixes && invalidPrefixes.some((p) => key.startsWith(p)))
      return false;
    return key.startsWith(prefix);
  });
  return keys;
}

function getLocalStorageDataFromPrefix(
  prefix: string,
  args: { invalidPrefixes?: string[]; json?: boolean } = {}
) {
  const { json = true } = args;

  const keys = getLocalStorageKeysFromPrefix(prefix, args.invalidPrefixes);

  if (json) {
    try {
      const result = keys.map((key) =>
        JSON.parse(window.localStorage.getItem(key)!)
      );
      return result;
    } catch (error) {
      return [];
    }
  }
  const result = keys.map((data) => window.localStorage.getItem(data)!);
  return result;
}
