import { useCallback } from "react";
import { Deck, DeckAnalytics } from "../types";
import {
  calculateDrawProbability,
  calculateComboHandProbability,
  estimateCardEfficiency,
} from "../utils/probabilityUtils";
import { Logger } from "../../../utils/logger";

// Create a logger for deck analytics
const logger = Logger.createLogger("DeckAnalytics");

export function useDeckAnalytics() {
  const analyzeDeck = useCallback((deck: Deck): DeckAnalytics => {
    logger.info(
      `Analyzing deck: "${deck.name}" (${deck.mainDeck.length} cards)`
    );

    // Initialize counters and distributions
    const typeDistribution: Record<string, number> = {};
    const attributeDistribution: Record<string, number> = {};
    const levelDistribution: Record<string, number> = {};
    const cardNameCount: Record<string, number> = {};
    let monsterCount = 0;
    let spellCount = 0;
    let trapCount = 0;

    // Process main deck
    deck.mainDeck.forEach((card) => {
      // Count card copies for key cards
      cardNameCount[card.name] = (cardNameCount[card.name] || 0) + 1;

      // Analyze card types
      if (card.type.includes("Monster")) {
        monsterCount++;

        // Track monster type
        const monsterType = card.race || "Unknown";
        typeDistribution[monsterType] =
          (typeDistribution[monsterType] || 0) + 1;

        // Track attribute
        if (card.attribute) {
          attributeDistribution[card.attribute] =
            (attributeDistribution[card.attribute] || 0) + 1;
        }

        // Track level/rank
        if (card.level) {
          levelDistribution[card.level] =
            (levelDistribution[card.level] || 0) + 1;
        }
      } else if (card.type.includes("Spell")) {
        spellCount++;
        typeDistribution["Spell"] = (typeDistribution["Spell"] || 0) + 1;
      } else if (card.type.includes("Trap")) {
        trapCount++;
        typeDistribution["Trap"] = (typeDistribution["Trap"] || 0) + 1;
      }
    });

    // Find potential archetypes by analyzing card names and descriptions
    const potentialArchetypes: Record<string, number> = {};
    const archetypeThreshold = 3; // Minimum cards to define an archetype

    // Check explicit archetypes from API
    deck.mainDeck.concat(deck.extraDeck).forEach((card) => {
      if (card.archetype) {
        potentialArchetypes[card.archetype] =
          (potentialArchetypes[card.archetype] || 0) + 1;
      }
    });

    // Check card names for patterns (simple heuristic)
    const cardNames = deck.mainDeck
      .concat(deck.extraDeck)
      .map((card) => card.name);
    const nameWords = cardNames
      .join(" ")
      .split(/[\s-]+/)
      .filter((word) => word.length > 3)
      .map((word) => word.toLowerCase());

    // Count word frequency
    const wordCounts: Record<string, number> = {};
    nameWords.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Add potential name-based archetypes
    Object.entries(wordCounts)
      .filter(([_, count]) => count >= archetypeThreshold)
      .forEach(([word, count]) => {
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
        potentialArchetypes[capitalizedWord] = count;
      });

    // Calculate key cards and their opening probabilities
    logger.info(
      `Calculating key card probabilities for ${
        Object.keys(cardNameCount).length
      } unique cards`
    );

    const keyCards = Object.entries(cardNameCount)
      .filter(([_, count]) => count >= 2) // Only cards with 2+ copies
      .map(([name, copies]) => {
        logger.debug(`Processing key card: ${name} (${copies} copies)`);

        // Calculate probability using the fixed utility function
        const probability = calculateDrawProbability(
          deck.mainDeck.length,
          copies,
          5 // Standard opening hand size
        );

        logger.debug(`${name}: ${probability}% chance to open with`);

        return {
          name,
          copies,
          openingProbability: probability,
        };
      })
      .sort((a, b) => b.openingProbability - a.openingProbability);

    logger.info(`Found ${keyCards.length} key cards`);

    // Log the top 5 key cards for visibility
    if (keyCards.length > 0) {
      logger.info("Top key cards:");
      keyCards.slice(0, 5).forEach((card, idx) => {
        logger.info(
          `${idx + 1}. ${card.name} (${card.copies}x): ${
            card.openingProbability
          }%`
        );
      });
    }

    // Calculate various combo probabilities that were previously in DeckAnalytics
    const drawProbabilities = [];

    // Single card probabilities
    for (let i = 0; i < Math.min(5, keyCards.length); i++) {
      const card = keyCards[i];

      drawProbabilities.push({
        scenario: `Drawing ${card.name}`,
        cards: [card.name],
        copies: card.copies,
        probability: card.openingProbability, // Using already calculated value
      });
    }

    // Two-card combo probabilities
    if (keyCards.length >= 2) {
      for (let i = 0; i < Math.min(3, keyCards.length - 1); i++) {
        const card1 = keyCards[i];
        const card2 = keyCards[i + 1];

        const probability = calculateComboHandProbability(
          deck.mainDeck.length,
          5,
          [
            [{ name: card1.name, copies: card1.copies }],
            [{ name: card2.name, copies: card2.copies }],
          ]
        );

        drawProbabilities.push({
          scenario: `Drawing ${card1.name} AND ${card2.name}`,
          cards: [card1.name, card2.name],
          copies: card1.copies + card2.copies,
          probability,
        });
      }
    }

    // Three-card combo probabilities
    if (keyCards.length >= 3) {
      const card1 = keyCards[0];
      const card2 = keyCards[1];
      const card3 = keyCards[2];

      const probability = calculateComboHandProbability(
        deck.mainDeck.length,
        5,
        [
          [{ name: card1.name, copies: card1.copies }],
          [{ name: card2.name, copies: card2.copies }],
          [{ name: card3.name, copies: card3.copies }],
        ]
      );

      drawProbabilities.push({
        scenario: `Perfect hand (${card1.name}, ${card2.name}, ${card3.name})`,
        cards: [card1.name, card2.name, card3.name],
        copies: card1.copies + card2.copies + card3.copies,
        probability,
      });
    }

    // Calculate card efficiencies
    const cardEfficiencies = keyCards.slice(0, 5).map((card) => ({
      card,
      metrics: estimateCardEfficiency(card, deck.mainDeck.length),
    }));

    // Calculate a deck consistency score
    const consistencyScore = calculateConsistencyScore(
      keyCards,
      monsterCount,
      spellCount,
      trapCount,
      deck.mainDeck.length
    );

    // Calculate deck style and ratios
    const powerUtilityRatio = (() => {
      const monsterRatio = monsterCount / deck.mainDeck.length;
      const spellRatio = spellCount / deck.mainDeck.length;
      const trapRatio = trapCount / deck.mainDeck.length;

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

    // Calculate combo probability
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
        deck.mainDeck.length,
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

    // Return the enhanced analytics object with ALL calculated metrics
    const result = {
      typeDistribution,
      attributeDistribution,
      levelDistribution,
      keyCards,
      deckSize: deck.mainDeck.length,
      consistencyScore,
      extraDeckSize: deck.extraDeck.length,
      potentialArchetypes: Object.entries(potentialArchetypes)
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
    };

    logger.info("Deck analysis complete");
    return result;
  }, []);

  // Calculate overall deck consistency
  const calculateConsistencyScore = (
    keyCards: Array<{
      name: string;
      copies: number;
      openingProbability: number;
    }>,
    monsterCount: number,
    spellCount: number,
    trapCount: number,
    deckSize: number
  ): number => {
    // Weight factors
    const keyCardWeight = 0.5;
    const sizeWeight = 0.2;
    const ratioWeight = 0.3;

    // Key card consistency (higher is better)
    const keyCardScore = Math.min(
      100,
      keyCards.reduce((sum, card) => sum + card.openingProbability, 0) / 2
    );

    // Deck size consistency (40 is optimal, higher is worse)
    const sizeScore = Math.max(0, 100 - Math.abs(deckSize - 40) * 2);

    // Card type ratio consistency
    // Simplistic model: 45-55% monsters, 35-45% spells, 5-15% traps is "ideal"
    const monsterRatio = monsterCount / deckSize;
    const spellRatio = spellCount / deckSize;
    const trapRatio = trapCount / deckSize;

    const monsterScore =
      100 - Math.min(100, Math.abs(monsterRatio - 0.5) * 200);
    const spellScore = 100 - Math.min(100, Math.abs(spellRatio - 0.4) * 200);
    const trapScore = 100 - Math.min(100, Math.abs(trapRatio - 0.1) * 200);

    const ratioScore = (monsterScore + spellScore + trapScore) / 3;

    // Weighted final score
    return (
      keyCardScore * keyCardWeight +
      sizeScore * sizeWeight +
      ratioScore * ratioWeight
    );
  };

  return { analyzeDeck };
}
