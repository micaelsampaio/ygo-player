import { getStorage, safeGetItem, safeSetItem } from "../../../scripts/safe-storage";

/**
 * Remembers, per kind of duel, that the viewer dismissed its first-duel tips: a bot duel and a
 * manual one play differently, so seeing one set doesn't hide the other. Storage can be missing
 * or throw (private mode, blocked site data), in which case the tips simply show again next
 * time — never an error.
 */
export const FIRST_DUEL_TIPS_KEY = "ygo-first-duel-tips-dismissed";

/** bot: the rules engine plays the opponent. solo: you play both sides. pvp: a person across. */
export type DuelTipsKind = "bot" | "solo" | "pvp";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const keyFor = (kind: DuelTipsKind) => `${FIRST_DUEL_TIPS_KEY}:${kind}`;

export function hasDismissedFirstDuelTips(kind: DuelTipsKind, storage: StorageLike | null | undefined = getStorage()): boolean {
  return safeGetItem(keyFor(kind), storage ?? undefined) === "1";
}

export function dismissFirstDuelTips(kind: DuelTipsKind, storage: StorageLike | null | undefined = getStorage()): void {
  // Storage blocked: the tips come back next duel.
  safeSetItem(keyFor(kind), "1", storage ?? undefined);
}

/** Which tips a duel gets, from its options: an engine room is a bot duel, controlling both sides is solo. */
export function duelTipsKind({ engineRoom, controlsBothSides }: { engineRoom: boolean; controlsBothSides: boolean }): DuelTipsKind {
  if (engineRoom) return "bot";
  return controlsBothSides ? "solo" : "pvp";
}

/** Tips are for someone actually playing: not spectators/judges, not replays. */
export function shouldOfferFirstDuelTips({ isPlayerClient, gameMode }: { isPlayerClient: boolean; gameMode?: string }): boolean {
  return isPlayerClient && gameMode !== "REPLAY";
}

type Tip = { title: string; body: string };

const CARD_MENUS: Tip = {
  title: "Card menus",
  body: "Tap a card in your hand or on the field to see what you can do with it. Less common moves are under \"More moves…\".",
};

const TURN_BAR: Tip = {
  title: "Phases and turns",
  body: "Click the phase marker on the field to move to the next phase or end your turn (N and E on a keyboard). Undo is at the bottom right.",
};

export const FIRST_DUEL_TIPS: Record<DuelTipsKind, Tip[]> = {
  bot: [
    {
      title: "Your legal moves",
      body: "Tap a card to see what the rules let it do right now. The Assisted panel lists every move you can make.",
    },
    TURN_BAR,
    {
      title: "Responding",
      body: "When the bot does something you can answer, a prompt asks you. Space picks Continue or the only option; Chain stops in Settings decides how often it asks.",
    },
  ],
  solo: [
    CARD_MENUS,
    TURN_BAR,
    {
      title: "Both sides are yours",
      body: "You play both decks, so you can test lines and see how your hand plays out. Settings can place cards in the first free zone for you.",
    },
  ],
  pvp: [
    CARD_MENUS,
    TURN_BAR,
    {
      title: "Responding",
      body: "OK passes to your opponent (hold it to auto-pass). Think and Wait tell them you need a moment.",
    },
  ],
};
