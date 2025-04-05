import { Card, Deck } from "./types";

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

// Utility function to validate if a card can be added to the deck
export const canAddCardToDeck = (deck: Deck, cardId: number): boolean => {
  return getCardCopiesInDeck(deck, cardId) < 3;
};
