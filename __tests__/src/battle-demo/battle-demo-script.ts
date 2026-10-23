/**
 * Card data for the demo lives in public/battle-demo-api/cards (a handful of
 * entries copied from ygo-data/data/cards.json). It doubles as the duel's card
 * API: the player downloads the cards of a local duel from `${apiUrl}/cards?ids=…`
 * (the static file ignores the query), so no external API is needed.
 */
export const BATTLE_DEMO_API_PATH = "/battle-demo-api";

/**
 * The battle demo's prebuilt board and scripted sequence.
 *
 * Board (player 0 = bottom, the local player):
 *   P1 M-1 Blue-Eyes White Dragon (3000)   P2 M2-2 Dark Magician Girl (2000, face-up ATK)
 *   P1 M-3 Dark Magician (2500)            P2 M2-4 Mystical Elf (set, DEF 2000)
 *   P1 M-5 Summoned Skull (2500)
 * The duel starts in Main Phase 1; the script moves to the Battle Phase.
 */

export const CARD = {
  blueEyes: 89631139,
  darkMagician: 46986414,
  summonedSkull: 70781052,
  kuriboh: 40640057,
  mysticalElf: 15025844,
  darkMagicianGirl: 38033121,
} as const;

let demoCards: any[] | null = null;

export async function loadBattleDemoCards(): Promise<void> {
  if (demoCards) return;
  const response = await fetch(`${BATTLE_DEMO_API_PATH}/cards`);
  if (!response.ok) throw new Error(`battle demo: card data HTTP ${response.status}`);
  demoCards = await response.json();
}

const byId = (id: number) => {
  const card = demoCards?.find((c) => c.id === id);
  if (!card) throw new Error(`battle demo: card ${id} missing (call loadBattleDemoCards first)`);
  return card;
};

export type BattleDemoStep =
  | { kind: "phase"; label: string; phase: string; extraWaitMs?: number }
  | {
      kind: "attack";
      label: string;
      attackingId: number;
      attackingZone: string;
      attackedId: number;
      attackedZone: string;
      battleDamage?: number;
      destroyAttacked?: boolean;
      destroyAttacking?: boolean;
      extraWaitMs?: number;
    }
  | { kind: "direct"; label: string; id: number; originZone: string; extraWaitMs?: number };

export const BATTLE_DEMO_STEPS: BattleDemoStep[] = [
  { kind: "phase", label: "Enter Battle Phase", phase: "Battle" },
  {
    kind: "attack",
    label: "Blue-Eyes attacks Dark Magician Girl (1000 dmg, destroy)",
    attackingId: CARD.blueEyes,
    attackingZone: "M-1",
    attackedId: CARD.darkMagicianGirl,
    attackedZone: "M2-2",
    battleDamage: 1000,
    destroyAttacked: true,
    extraWaitMs: 1000,
  },
  {
    kind: "attack",
    label: "Dark Magician attacks set monster (flip, destroy)",
    attackingId: CARD.darkMagician,
    attackingZone: "M-3",
    attackedId: CARD.mysticalElf,
    attackedZone: "M2-4",
    destroyAttacked: true,
    extraWaitMs: 1000,
  },
  {
    kind: "direct",
    label: "Summoned Skull attacks directly (2500 dmg)",
    id: CARD.summonedSkull,
    originZone: "M-5",
    extraWaitMs: 1000,
  },
  { kind: "phase", label: "Main Phase 2", phase: "Main Phase 2" },
];

/** Editor-mode props for <ygo-player>.editor(): prebuilt field via options.fieldState. Call loadBattleDemoCards() first. */
export function buildBattleDemoConfig(cdnUrl: string) {
  const filler = Array.from({ length: 8 }, () => byId(CARD.kuriboh));
  return {
    cdnUrl,
    apiUrl: `${window.location.origin}${BATTLE_DEMO_API_PATH}`,
    gameMode: "EDITOR",
    commands: [],
    players: [
      {
        name: "Yugi",
        mainDeck: [byId(CARD.blueEyes), byId(CARD.darkMagician), byId(CARD.summonedSkull), ...filler],
        extraDeck: [],
      },
      {
        name: "Kaiba",
        mainDeck: [byId(CARD.darkMagicianGirl), byId(CARD.mysticalElf), ...filler],
        extraDeck: [],
      },
    ],
    options: {
      shuffleDecks: false,
      draw: 2,
      startPhase: "Main Phase 1",
      fieldState: [
        { id: CARD.blueEyes, zone: "M-1", position: "faceup-attack" },
        { id: CARD.darkMagician, zone: "M-3", position: "faceup-attack" },
        { id: CARD.summonedSkull, zone: "M-5", position: "faceup-attack" },
        { id: CARD.darkMagicianGirl, zone: "M2-2", position: "faceup-attack" },
        { id: CARD.mysticalElf, zone: "M2-4", position: "facedown" },
      ],
    },
    actions: {
      saveReplay: async () => {},
    },
  };
}
