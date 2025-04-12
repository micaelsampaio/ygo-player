import { useCallback, useMemo } from "react";
import { Deck, DeckAnalytics, CardRole } from "../types";
import {
  calculateDrawProbability,
  calculateComboHandProbability,
  estimateCardEfficiency,
} from "../utils/probabilityUtils";
import { Logger } from "../../../utils/logger";

// Create a logger for deck analytics
const logger = Logger.createLogger("DeckAnalytics");
// Set to true only during development/debugging
const ENABLE_VERBOSE_LOGGING = false;

// Wrapper function to conditionally log only when verbose logging is enabled
const conditionalLog = (message: string, ...args: any[]) => {
  if (ENABLE_VERBOSE_LOGGING) {
    logger.info(message, ...args);
  }
};

// Cache for common probability calculations to avoid recomputing
const probabilityCache = new Map<string, number>();

// Helper function to get cached probability or calculate and cache it
function getCachedProbability(
  deckSize: number,
  copies: number,
  handSize: number
): number {
  const key = `${deckSize}-${copies}-${handSize}`;

  if (!probabilityCache.has(key)) {
    const probability = calculateDrawProbability(deckSize, copies, handSize);
    probabilityCache.set(key, probability);
    return probability;
  }

  return probabilityCache.get(key)!;
}

export function useDeckAnalytics() {
  const analyzeDeck = useCallback((deck: Deck): DeckAnalytics => {
    // Performance measurement
    const startTime = performance.now();
    conditionalLog(
      `Analyzing deck: "${deck.name}" (${deck.mainDeck.length} cards)`
    );

    // Initialize counters and distributions - use Map for better performance
    const typeDistribution = new Map<string, number>();
    const attributeDistribution = new Map<string, number>();
    const levelDistribution = new Map<string, number>();
    const cardNameCount = new Map<string, number>();

    // Use a single pass through the deck to gather all stats
    let monsterCount = 0;
    let spellCount = 0;
    let trapCount = 0;

    // Pre-allocate arrays to avoid expensive resizing operations
    const mainDeckSize = deck.mainDeck.length;
    const deckCards = [...deck.mainDeck];

    // Process main deck in a single pass
    for (let i = 0; i < mainDeckSize; i++) {
      const card = deckCards[i];

      // Count card copies for key cards
      cardNameCount.set(card.name, (cardNameCount.get(card.name) || 0) + 1);

      // Analyze card types
      if (card.type.includes("Monster")) {
        monsterCount++;

        // Track monster type
        const monsterType = card.race || "Unknown";
        typeDistribution.set(
          monsterType,
          (typeDistribution.get(monsterType) || 0) + 1
        );

        // Track attribute
        if (card.attribute) {
          attributeDistribution.set(
            card.attribute,
            (attributeDistribution.get(card.attribute) || 0) + 1
          );
        }

        // Track level/rank
        if (card.level) {
          levelDistribution.set(
            card.level,
            (levelDistribution.get(card.level) || 0) + 1
          );
        }
      } else if (card.type.includes("Spell")) {
        spellCount++;
        typeDistribution.set("Spell", (typeDistribution.get("Spell") || 0) + 1);
      } else if (card.type.includes("Trap")) {
        trapCount++;
        typeDistribution.set("Trap", (typeDistribution.get("Trap") || 0) + 1);
      }
    }

    // Convert maps back to objects for compatibility
    const typeDistributionObj = Object.fromEntries(typeDistribution);
    const attributeDistributionObj = Object.fromEntries(attributeDistribution);
    const levelDistributionObj = Object.fromEntries(levelDistribution);

    // Find potential archetypes
    const potentialArchetypes = new Map<string, number>();

    // Only use explicit archetypes from API - combine loops for efficiency
    const allCards = [...deck.mainDeck, ...deck.extraDeck];
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];
      if (card.archetype) {
        potentialArchetypes.set(
          card.archetype,
          (potentialArchetypes.get(card.archetype) || 0) + 1
        );
      }
    }

    conditionalLog("Found archetypes:", Array.from(potentialArchetypes.keys()));

    // Calculate key cards and their opening probabilities
    const uniqueCardCount = cardNameCount.size;
    conditionalLog(
      `Calculating key card probabilities for ${uniqueCardCount} unique cards`
    );

    // Use array-based operations for better performance
    const keyCards = Array.from(cardNameCount.entries())
      .filter(([_, count]) => count >= 2) // Only cards with 2+ copies
      .map(([name, copies]) => {
        // Use cached probability calculation
        const probability = getCachedProbability(mainDeckSize, copies, 5);

        return {
          name,
          copies,
          openingProbability: probability,
        };
      })
      .sort((a, b) => b.openingProbability - a.openingProbability);

    conditionalLog(`Found ${keyCards.length} key cards`);

    // Log the top 5 key cards for visibility
    if (keyCards.length > 0 && ENABLE_VERBOSE_LOGGING) {
      conditionalLog("Top key cards:");
      keyCards.slice(0, 5).forEach((card, idx) => {
        conditionalLog(
          `${idx + 1}. ${card.name} (${card.copies}x): ${
            card.openingProbability
          }%`
        );
      });
    }

    // Calculate various combo probabilities that were previously in DeckAnalytics
    const drawProbabilities = [];

    // Single card probabilities - limit to top 5 for performance
    const topKeyCards = keyCards.slice(0, 5);
    for (let i = 0; i < topKeyCards.length; i++) {
      const card = topKeyCards[i];
      drawProbabilities.push({
        scenario: `Drawing ${card.name}`,
        cards: [card.name],
        copies: card.copies,
        probability: card.openingProbability, // Using already calculated value
      });
    }

    // Two-card combo probabilities - only calculate for top cards
    if (keyCards.length >= 2) {
      const comboLimit = Math.min(3, keyCards.length - 1);
      for (let i = 0; i < comboLimit; i++) {
        const card1 = keyCards[i];
        const card2 = keyCards[i + 1];

        const probability = calculateComboHandProbability(mainDeckSize, 5, [
          [{ name: card1.name, copies: card1.copies }],
          [{ name: card2.name, copies: card2.copies }],
        ]);

        drawProbabilities.push({
          scenario: `Drawing ${card1.name} AND ${card2.name}`,
          cards: [card1.name, card2.name],
          copies: card1.copies + card2.copies,
          probability,
        });
      }
    }

    // Three-card combo probabilities - only if we have enough key cards
    if (keyCards.length >= 3) {
      const card1 = keyCards[0];
      const card2 = keyCards[1];
      const card3 = keyCards[2];

      const probability = calculateComboHandProbability(mainDeckSize, 5, [
        [{ name: card1.name, copies: card1.copies }],
        [{ name: card2.name, copies: card2.copies }],
        [{ name: card3.name, copies: card3.copies }],
      ]);

      drawProbabilities.push({
        scenario: `Perfect hand (${card1.name}, ${card2.name}, ${card3.name})`,
        cards: [card1.name, card2.name, card3.name],
        copies: card1.copies + card2.copies + card3.copies,
        probability,
      });
    }

    // Calculate card efficiencies - limit to top 5 for performance
    const cardEfficiencies = topKeyCards.map((card) => ({
      card,
      metrics: estimateCardEfficiency(card, mainDeckSize),
    }));

    // Calculate a deck consistency score
    const consistencyScore = calculateConsistencyScore(
      keyCards,
      monsterCount,
      spellCount,
      trapCount,
      mainDeckSize
    );

    // Calculate deck style and ratios - memoize calculation results
    const powerUtilityRatio = (() => {
      const monsterRatio = monsterCount / mainDeckSize;
      const spellRatio = spellCount / mainDeckSize;
      const trapRatio = trapCount / mainDeckSize;

      let deckStyle = "Unknown";
      let explanation = "";

      if (monsterRatio > 0.6) {
        deckStyle = "Aggressive";
        explanation =
          "High monster count suggests an aggro strategy focused on dealing damage quickly.";
      } else if (trapRatio > 0.25) {
        deckStyle = "Control";
        explanation =
          "Significant trap presence indicates a control-oriented strategy.";
      } else if (spellRatio > 0.4) {
        deckStyle = "Combo";
        explanation =
          "High spell count suggests a combo-oriented deck with emphasis on card advantage.";
      } else {
        deckStyle = "Balanced";
        explanation =
          "Even distribution of card types suggests a midrange or toolbox strategy.";
      }

      return { deckStyle, explanation, monsterRatio, spellRatio, trapRatio };
    })();

    // Calculate combo probability - only if we have enough key cards
    const comboProbability = (() => {
      const starterCards = keyCards
        .filter((card) => card.copies >= 3)
        .map((card) => ({ name: card.name, copies: card.copies }));

      const extenderCards = keyCards
        .filter((card) => card.copies >= 2 && card.copies < 3)
        .map((card) => ({ name: card.name, copies: card.copies }));

      if (starterCards.length === 0 || extenderCards.length === 0) {
        return {
          probability: 0,
          explanation:
            "Not enough key cards identified to calculate combo probability.",
        };
      }

      const probability = calculateComboHandProbability(
        mainDeckSize,
        5, // Standard opening hand
        [starterCards, extenderCards]
      );

      return {
        probability: Math.min(probability, 100),
        explanation:
          "Probability of opening with at least one starter AND one extender card.",
      };
    })();

    // Calculate resource generation
    const resourceGeneration = (() => {
      const drawPotential = Math.min(10, (spellCount / 2) * 10);

      return {
        score: drawPotential,
        explanation:
          "Based on spell count. Higher scores indicate better card advantage generation.",
      };
    })();

    // Add role-based probabilities with grouping using Map for better performance
    const roleGroups = new Map();

    for (let i = 0; i < mainDeckSize; i++) {
      const card = deck.mainDeck[i];
      if (!card.roleInfo) continue;

      const key = card.name; // Group just by name
      if (!roleGroups.has(key)) {
        roleGroups.set(key, {
          id: card.id,
          name: card.name,
          copies: 1,
          roleInfo: card.roleInfo,
        });
      } else {
        const group = roleGroups.get(key);
        group.copies++;
        roleGroups.set(key, group);
      }
    }

    const mainDeckWithRoles = Array.from(roleGroups.values()).map((group) => {
      // Use the cached probability calculation
      const probability = getCachedProbability(
        mainDeckSize, // total cards in deck
        group.copies, // number of copies
        5 // opening hand size
      );

      return {
        ...group,
        roleInfo: {
          ...group.roleInfo,
          probability,
        },
      };
    });

    // Calculate analysis time
    const endTime = performance.now();
    const analysisTime = endTime - startTime;
    conditionalLog(`Deck analysis completed in ${analysisTime.toFixed(2)}ms`);

    // Return the enhanced analytics object with ALL calculated metrics
    const result = {
      typeDistribution: typeDistributionObj,
      attributeDistribution: attributeDistributionObj,
      levelDistribution: levelDistributionObj,
      keyCards,
      deckSize: mainDeckSize,
      consistencyScore,
      extraDeckSize: deck.extraDeck.length,
      potentialArchetypes: Array.from(potentialArchetypes.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      monsterCount,
      spellCount,
      trapCount,
      drawProbabilities,
      cardEfficiencies,
      powerUtilityRatio,
      comboProbability,
      resourceGeneration,
      mainDeck: mainDeckWithRoles,
      performanceMetrics: {
        analysisTime,
        uniqueCardCount,
        totalCardsProcessed: mainDeckSize + deck.extraDeck.length,
      },
    };

    return result;
  }, []);

  return { analyzeDeck };
}

// Helper function to calculate consistency score
function calculateConsistencyScore(
  keyCards: Array<{ name: string; copies: number; openingProbability: number }>,
  monsterCount: number,
  spellCount: number,
  trapCount: number,
  deckSize: number
): number {
  // Implement optimized consistency score calculation
  const keyCardProbabilityWeight = 0.5;
  const deckRatioWeight = 0.3;
  const cardVarietyWeight = 0.2;

  // Calculate probability weight based on key cards
  const topFiveKeyCards = keyCards.slice(0, 5);
  const avgProbability =
    topFiveKeyCards.length > 0
      ? topFiveKeyCards.reduce(
          (sum, card) => sum + card.openingProbability,
          0
        ) / topFiveKeyCards.length
      : 0;
  const normalizedProbability = avgProbability / 100;

  // Calculate deck ratio score - balanced decks are more consistent
  const idealMonsterRatio = 0.45; // 45% monsters is generally good
  const idealSpellRatio = 0.4; // 40% spells
  const idealTrapRatio = 0.15; // 15% traps

  const actualMonsterRatio = monsterCount / deckSize;
  const actualSpellRatio = spellCount / deckSize;
  const actualTrapRatio = trapCount / deckSize;

  const ratioDeviation =
    Math.abs(actualMonsterRatio - idealMonsterRatio) +
    Math.abs(actualSpellRatio - idealSpellRatio) +
    Math.abs(actualTrapRatio - idealTrapRatio);

  const normalizedRatioScore = Math.max(0, 1 - ratioDeviation);

  // Card variety score - fewer unique cards means more consistency
  const uniqueCardRatio = keyCards.length / deckSize;
  const normalizedVarietyScore = Math.min(
    1,
    keyCards.filter((c) => c.copies >= 2).length / 10
  );

  // Combine all factors into final score
  const finalScore =
    (normalizedProbability * keyCardProbabilityWeight +
      normalizedRatioScore * deckRatioWeight +
      normalizedVarietyScore * cardVarietyWeight) *
    100;

  return Math.min(100, Math.max(0, Math.round(finalScore)));
}
