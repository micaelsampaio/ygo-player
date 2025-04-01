export type CardAttribute =
  | "DARK"
  | "LIGHT"
  | "WATER"
  | "FIRE"
  | "EARTH"
  | "WIND"
  | "DIVINE"
  | "";

export type MonsterType =
  | "Aqua"
  | "Beast"
  | "Beast-Warrior"
  | "Cyberse"
  | "Dinosaur"
  | "Divine-Beast"
  | "Dragon"
  | "Fairy"
  | "Fiend"
  | "Fish"
  | "Insect"
  | "Machine"
  | "Plant"
  | "Psychic"
  | "Pyro"
  | "Reptile"
  | "Rock"
  | "Sea Serpent"
  | "Spellcaster"
  | "Thunder"
  | "Warrior"
  | "Winged Beast"
  | "Wyrm"
  | "Zombie"
  | "";

export type CardCategory = "Monster" | "Spell" | "Trap";

export type MonsterCategory =
  | "Normal"
  | "Effect"
  | "Ritual"
  | "Fusion"
  | "Synchro"
  | "XYZ"
  | "Pendulum"
  | "Link"
  | "Tuner"
  | "Gemini"
  | "Union"
  | "Spirit"
  | "Flip"
  | "Toon";

export type SpellCategory =
  | "Normal"
  | "Quick-Play"
  | "Continuous"
  | "Ritual"
  | "Equip"
  | "Field";

export type TrapCategory = "Normal" | "Continuous" | "Counter";

export type CardRole =
  | "Starter" // Cards that can start your combos
  | "Extender" // Cards that extend your plays
  | "Handtrap" // Interruption from hand
  | "BoardBreaker" // Cards that break established boards
  | "Engine" // Part of main deck engine
  | "NonEngine" // Generic good cards
  | "Garnets" // Cards you don't want to draw
  | "Flexible"; // Multiple roles

export interface CardRoleInfo {
  role: CardRole;
  isAutoDetected: boolean; // Whether role was auto-detected or user-assigned
  notes?: string; // Optional user notes about why this role
}

// Card image type from YGOPRODeck API
export interface CardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped?: string;
}

// Card prices type from YGOPRODeck API
export interface CardPriceInfo {
  cardmarket_price?: string;
  tcgplayer_price?: string;
  ebay_price?: string;
  amazon_price?: string;
  coolstuffinc_price?: string;
}

// Main Card interface that matches YGOPRODeck API structure
export interface Card {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: CardAttribute;
  archetype?: string;
  card_sets?: Array<{
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_rarity_code: string;
    set_price: string;
  }>;
  card_images: CardImage[];
  card_prices: CardPriceInfo[];
  linkval?: number;
  linkmarkers?: string[];
  scale?: number;
  roleInfo?: CardRoleInfo;
}

// Deck structure
export interface Deck {
  name: string;
  mainDeck: Card[];
  extraDeck: Card[];
}

// Advanced search filters
export interface SearchFilters {
  name: string;
  type: string;
  attribute: string;
  level: string;
  race: string;
  text: string;
}

// Unified DeckAnalytics type
export interface DeckAnalytics {
  typeDistribution: Record<string, number>;
  attributeDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  keyCards: Array<{
    name: string;
    copies: number;
    openingProbability: number;
  }>;
  deckSize: number;
  consistencyScore: number;
  extraDeckSize: number;
  potentialArchetypes: Array<{ name: string; count: number }>;
  monsterCount: number;
  spellCount: number;
  trapCount: number;
  mainDeck: Array<{
    id: number;
    name: string;
    roleInfo?: {
      role: CardRole;
      probability: number;
    };
  }>;
}

// Deck metrics calculated from analytics
export interface DeckMetrics {
  powerUtility: {
    deckStyle: string;
    explanation: string;
    monsterRatio: number;
    spellRatio: number;
    trapRatio: number;
  };
  comboProbability: {
    probability: number;
    explanation: string;
  };
  resourceGeneration: {
    score: number;
    explanation: string;
  };
  drawProbabilities: Array<{
    scenario: string;
    cards: string[];
    copies: number;
    probability: number;
  }>;
  cardEfficiencies: Array<{
    card: { name: string; copies: number; openingProbability: number };
    metrics: {
      overallScore: number;
      availability: number;
      utility: number;
      impact: number;
    };
  }>;
}

// Props for the DeckBuilder component
export interface DeckBuilderProps {
  initialDecks?: Deck[];
}

// Props for the SearchPanel component
export interface SearchPanelProps {
  onCardSelect: (card: Card) => void;
  onCardAdd: (card: Card) => void;
}

// Props for DeckAnalytics component
export interface DeckAnalyticsProps {
  analytics: DeckAnalytics | null;
}

// Add analytics interface for role distribution
export interface DeckRoleAnalytics {
  roleDistribution: Record<CardRole, number>;
  autoDetectedRoles: number;
  userAssignedRoles: number;
  suggestions: Array<{
    cardId: number;
    suggestedRole: CardRole;
    confidence: number;
    reason: string;
  }>;
}
