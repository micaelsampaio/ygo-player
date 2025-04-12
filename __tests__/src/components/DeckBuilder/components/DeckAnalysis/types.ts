export interface CardEfficiency {
  card: { name: string; copies: number; openingProbability: number };
  metrics: {
    overallScore: number;
    consistency: number;
    versatility: number;
    economy: number;
  };
}

export type DeckAnalyticsType = {
  typeDistribution: Record<string, number>;
  attributeDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  keyCards: Array<{ name: string; copies: number; openingProbability: number }>;
  deckSize: number;
  consistencyScore: number;
  extraDeckSize: number;
  potentialArchetypes: Array<{ name: string; count: number }>;
  monsterCount: number;
  spellCount: number;
  trapCount: number;
  drawProbabilities: Array<{
    scenario: string;
    cards: string[];
    copies: number;
    probability: number;
  }>;
  cardEfficiencies: Array<CardEfficiency>;
  powerUtilityRatio: {
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
  mainDeck?: Array<{
    id: string;
    name: string;
    roleInfo?: {
      role: string;
      probability?: number;
    };
  }>;
};

export interface DeckAnalyticsProps {
  analytics: DeckAnalyticsType | null;
  deck?: Deck;
}
