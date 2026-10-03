import { getStorage, safeGetItem, safeSetItem } from "../../../scripts/safe-storage";

/**
 * Remembers that the viewer dismissed the first-duel tips. Storage can be
 * missing or throw (private mode, blocked site data), in which case the tips
 * simply show again next time — never an error.
 */
export const FIRST_DUEL_TIPS_KEY = "ygo-first-duel-tips-dismissed";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function hasDismissedFirstDuelTips(storage: StorageLike | null | undefined = getStorage()): boolean {
  return safeGetItem(FIRST_DUEL_TIPS_KEY, storage ?? undefined) === "1";
}

export function dismissFirstDuelTips(storage: StorageLike | null | undefined = getStorage()): void {
  // Storage blocked: the tips come back next duel.
  safeSetItem(FIRST_DUEL_TIPS_KEY, "1", storage ?? undefined);
}

/** Tips are for someone actually playing: not spectators/judges, not replays. */
export function shouldOfferFirstDuelTips({ isPlayerClient, gameMode }: { isPlayerClient: boolean; gameMode?: string }): boolean {
  return isPlayerClient && gameMode !== "REPLAY";
}

export const FIRST_DUEL_TIPS: { title: string; body: string }[] = [
  {
    title: "Card menus",
    body: "Click a card in your hand or on the field to see what you can do with it: summon, set, activate and more.",
  },
  {
    title: "Phases and turns",
    body: "Click the phase marker on the field to move to the next phase or end your turn.",
  },
  {
    title: "Responding",
    body: "OK passes to your opponent (hold it to auto-pass). Think and Wait tell them you need a moment.",
  },
  {
    title: "Log and card counts",
    body: "The buttons at the bottom right open the duel log, show card counts and hold the game controls.",
  },
];
