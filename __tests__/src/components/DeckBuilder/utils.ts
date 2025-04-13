import { Card, Deck } from "./types";
import { banListService } from "./services/banListService";

// Helper function to determine potential archetypes for a card
export const determineCardArchetypes = (card: Card) => {
  // Simple archetype detection based on card name and description
  const archetypes: string[] = [];

  // List of popular archetypes
  const knownArchetypes = [
    "Blue-Eyes",
    "Dark Magician",
    "Red-Eyes",
    "Cyber Dragon",
    "HERO",
    "Eldlich",
    "Sky Striker",
    "Drytron",
    "Adamancipator",
    "Dogmatika",
    "Shaddoll",
    "Invoked",
    "Lightsworn",
    "Infernoble",
    "Phantom Knights",
    "Crusadia",
    "Salamangreat",
    "Thunder Dragon",
    "Burning Abyss",
    "Dinosaur",
    "Dragon Link",
    "Altergeist",
    "Tri-Brigade",
    "Virtual World",
    "Zoodiac",
    "Dragonmaid",
    "Orcust",
    "Endymion",
    "Pendulum",
    "Synchron",
    "Stardust",
    "Blackwing",
    "Six Samurai",
    "Ancient Gear",
    "Prank-Kids",
    "Mekk-Knight",
    "True Draco",
    "Subterror",
    "Danger!",
    "Noble Knight",
    "Kaiju",
  ];

  // Check for archetype matches in name
  knownArchetypes.forEach((archetype) => {
    if (card.name.includes(archetype) || card.desc.includes(archetype)) {
      archetypes.push(archetype);
    }
  });

  // Check for specific types of decks this card might fit into
  if (card.desc.includes("discard") || card.desc.includes("hand to the GY")) {
    archetypes.push("Hand Control");
  }

  if (card.desc.includes("negate") || card.desc.includes("cannot activate")) {
    archetypes.push("Control");
  }

  if (card.desc.includes("Special Summon from") && card.desc.includes("GY")) {
    archetypes.push("Graveyard-focused");
  }

  if (card.desc.includes("banish") && card.desc.includes("from your")) {
    archetypes.push("Banish-focused");
  }

  // Default to general categories if no specific archetypes found
  if (archetypes.length === 0) {
    if (card.type.includes("Spell")) {
      archetypes.push("Spell-heavy");
    } else if (card.type.includes("Trap")) {
      archetypes.push("Trap-heavy");
    } else if (card.type.includes("Link")) {
      archetypes.push("Link-focused");
    } else if (card.type.includes("XYZ")) {
      archetypes.push("XYZ-focused");
    } else if (card.type.includes("Synchro")) {
      archetypes.push("Synchro-focused");
    } else if (card.type.includes("Fusion")) {
      archetypes.push("Fusion-focused");
    } else {
      archetypes.push("General purpose");
    }
  }

  return archetypes.slice(0, 3); // Return top 3 archetypes
};

// Helper function to get card play style information
export const getCardPlayStyle = (card: Card) => {
  // Analyze card for general play style tips
  let playstyle = "";

  // Check if it's a staple card by looking for key effects
  if (
    card.desc.includes("negate") &&
    (card.desc.includes("hand") || card.type.includes("Counter"))
  ) {
    playstyle =
      "This is a strong interruption card that can disrupt your opponent's plays.";
  } else if (card.desc.includes("draw") && card.type.includes("Spell")) {
    playstyle =
      "This card provides draw power to increase your deck's consistency.";
  } else if (card.desc.includes("destroy") && card.desc.includes("field")) {
    playstyle =
      "This card provides field removal to break your opponent's board.";
  } else if (card.desc.includes("banish") && card.desc.includes("GY")) {
    playstyle =
      "This card provides graveyard control to prevent recursion strategies.";
  } else if (card.type.includes("Monster") && card.atk && card.atk >= 2500) {
    playstyle =
      "This is a high ATK monster that can apply significant pressure.";
  } else if (
    card.desc.includes("search") ||
    (card.desc.includes("add") &&
      card.desc.includes("from your Deck to your hand"))
  ) {
    playstyle =
      "This card increases consistency by searching for specific cards.";
  }

  return playstyle;
};

// Helper to check if a card belongs in the Extra Deck
export const isExtraDeckCard = (card: Card): boolean => {
  return ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
    card.type.includes(type)
  );
};

// Utility function to count card copies in both main and extra deck
export const getCardCopiesInDeck = (deck: Deck, cardId: number): number => {
  const mainDeckCopies = deck.mainDeck.filter(
    (card) => card.id === cardId
  ).length;
  const extraDeckCopies = deck.extraDeck.filter(
    (card) => card.id === cardId
  ).length;
  return mainDeckCopies + extraDeckCopies;
};

// Defines card ban status according to Yu-Gi-Oh rules
export type CardBanStatus =
  | "forbidden"
  | "limited"
  | "semi-limited"
  | "unlimited";

// Maximum allowed copies per card based on ban status
export const MAX_COPIES: Record<CardBanStatus, number> = {
  forbidden: 0,
  limited: 1,
  "semi-limited": 2,
  unlimited: 3,
};

// Gets the ban status of a card - this is now a synchronous wrapper that uses the cached data
export const getCardBanStatus = (cardId: number): CardBanStatus => {
  // Get the ban status from the cached data in the service (avoiding async call)
  try {
    const cacheKey = "banlist_current";
    const cache = (banListService as any).cache;

    // If we have cached data, use it
    if (cache && cache[cacheKey] && cache[cacheKey].entries) {
      return cache[cacheKey].entries[cardId] || "unlimited";
    }

    // Fallback to hardcoded ban list if no cache is available
    return BAN_LIST[cardId] || "unlimited";
  } catch (error) {
    console.error("Error accessing ban list cache:", error);
    // Fallback to hardcoded ban list
    return BAN_LIST[cardId] || "unlimited";
  }
};

// Hardcoded fallback ban list for cases where the service is not initialized
// This will be used as a fallback if the async ban list service is not available
export const BAN_LIST: Record<number, CardBanStatus> = {
  // Some examples of frequently limited cards in Yu-Gi-Oh
  7902349: "forbidden", // Left Arm of the Forbidden One
  44519536: "forbidden", // Right Leg of the Forbidden One
  70903634: "forbidden", // Right Arm of the Forbidden One
  8124921: "forbidden", // Left Leg of the Forbidden One
  33396948: "limited", // Exodia the Forbidden One
  11110587: "limited", // That Grass Looks Greener
  28566710: "limited", // Last Turn
  23002292: "limited", // Red-Eyes Dark Dragoon
  24224830: "limited", // Called by the Grave
  27174286: "semi-limited", // Return from the Different Dimension
  70368879: "semi-limited", // Upstart Goblin
  83764718: "semi-limited", // Monster Reborn
};

// Checks if a card can be added to a deck based on its ban status and current copies
export const canAddCardToDeck = (deck: Deck, cardId: number): boolean => {
  const currentCopies = getCardCopiesInDeck(deck, cardId);
  const banStatus = getCardBanStatus(cardId);
  const maxAllowed = MAX_COPIES[banStatus];

  return currentCopies < maxAllowed;
};
