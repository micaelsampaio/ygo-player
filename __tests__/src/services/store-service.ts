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

  static async loadReplaysFromDeckId(deckId: string, signal?: any) {
    if (isUserLoggedIn()) {
      return APIService.loadReplaysFromDeckId(deckId, signal);
    } else {
      try {
        const replays = getLocalStorageDataFromPrefix(`deckreplay_${deckId}_`);
        console.log("REPLAYS ", replays);
        replays.forEach(replay => replay.isLocal = true);
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
      if (deckId) {
        window.localStorage.setItem(`deckreplay_${deckId}_${replayId}`, JSON.stringify(replayData));
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

function getLocalStorageKeysFromPrefix(prefix: string, invalidPrefixes?: string[] | undefined) {
  const allKeys = Object.keys(localStorage);
  const keys = allKeys.filter((key) => {
    if (invalidPrefixes && invalidPrefixes.some(p => key.startsWith(p))) return false;
    return key.startsWith(prefix);
  });
  return keys;
}

function getLocalStorageDataFromPrefix(prefix: string, args: { invalidPrefixes?: string[], json?: boolean } = {}) {

  const { json = true } = args;

  const keys = getLocalStorageKeysFromPrefix(prefix, args.invalidPrefixes);

  console.log("KEYS: ", keys);

  if (json) {
    try {
      const result = keys.map(key => JSON.parse(window.localStorage.getItem(key)!));
      return result;
    } catch (error) {
      return [];
    }
  }
  const result = keys.map(data => window.localStorage.getItem(data)!);
  return result;
}