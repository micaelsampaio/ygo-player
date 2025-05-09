import { isUserLoggedIn } from "../utils/token-utils";
import { APIService } from "./api-service";

export class StoreService {
  static async getDeckById(deckId: string) {
    if (isUserLoggedIn()) {
      return APIService.getDeckById(deckId);
    } else {
      try {
        if (!deckId.startsWith("deck_")) deckId = `deck_${deckId}`;
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

  static async getReplayFromId(replayId: string) {
    if (isUserLoggedIn()) {
      throw new Error("not implemented");
    } else {
      const deckReplays = getLocalStorageKeysFromPrefix("replays_");
      for (const key of deckReplays) {
        const data = JSON.parse(window.localStorage.getItem(key)!);
        const replay = data.replays.find((replay: any) => String(replay.replayId || replay.id) === replayId);
        if (replay) {
          return replay;
        }
      }

      throw new Error("not found")

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
      const replayId = replayData.id ?? Date.now();
      replayData.id = String(replayId);

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
        if (!replay.replayId) {
          console.error("Missing replayId for deletion");
          return false;
        }

        // Get all keys that store replays
        const replayKeys = getLocalStorageKeysFromPrefix("replays_");

        // Iterate through each key
        for (const key of replayKeys) {
          const replayDataRaw = window.localStorage.getItem(key);
          if (!replayDataRaw) continue;

          const replayData = JSON.parse(replayDataRaw);

          // Find if this storage key contains the replay we want to delete
          const replayIndex = replayData.replays.findIndex(
            (r: any) => r.replayId === replay.replayId
          );

          // If found, remove it and update storage
          if (replayIndex >= 0) {
            replayData.replays.splice(replayIndex, 1);

            if (replayData.replays.length > 0) {
              window.localStorage.setItem(key, JSON.stringify(replayData));
            } else {
              window.localStorage.removeItem(key);
            }

            return true;
          }
        }

        console.error(`No replay found with ID ${replay.replayId}`);
        return false;
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

  static async saveCombo(replayId: string, comboData: any) {
    if (isUserLoggedIn()) {
      throw new Error("not implemented");
    } else {
      const deckReplays = getLocalStorageKeysFromPrefix("replays_");

      for (const key of deckReplays) {
        const storedData = JSON.parse(window.localStorage.getItem(key)!);
        const replay = storedData.replays.find((replay: any) => String(replay.replayId || replay.id) === replayId);

        if (replay) {
          comboData.id = String(Date.now());
          replay.combos = replay.combos ?? [];
          replay.combos.push(comboData);

          window.localStorage.setItem(key, JSON.stringify(storedData));
          return replay;
        }
      }

      throw new Error("Replay not found in local storage");
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
