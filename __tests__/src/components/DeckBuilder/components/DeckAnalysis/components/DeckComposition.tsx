import React, { useMemo, useEffect } from "react";
import { DeckAnalyticsType } from "../types";
import "../styles/DeckComposition.css";

interface DeckCompositionProps {
  analytics: DeckAnalyticsType;
}

const DeckComposition: React.FC<DeckCompositionProps> = ({ analytics }) => {
  // Debug logging
  useEffect(() => {
    console.log(
      "DEBUG DeckComposition: Received analytics with monsterCount:",
      analytics.monsterCount,
      "spellCount:",
      analytics.spellCount,
      "trapCount:",
      analytics.trapCount
    );

    // Inspect deck content to calculate counts directly if needed
    if (
      analytics.monsterCount === 0 &&
      analytics.spellCount === 0 &&
      analytics.trapCount === 0
    ) {
      console.log("DEBUG: All counts are zero, inspecting mainDeck directly");

      // Get the main deck if available
      if (analytics.mainDeck && analytics.mainDeck.length > 0) {
        console.log("DEBUG: MainDeck available, will recalculate counts");
      }
    }
  }, [analytics]);

  // Calculate playsets (cards with 3 copies)
  const playsetInfo = useMemo(() => {
    if (!analytics.keyCards) return { count: 0, percentage: 0 };

    const playsetCards = analytics.keyCards.filter((card) => card.copies === 3);
    const playsetCount = playsetCards.length;
    const uniqueCardsCount = analytics.keyCards.length;

    return {
      count: playsetCount,
      percentage:
        uniqueCardsCount > 0
          ? Math.round((playsetCount / uniqueCardsCount) * 100)
          : 0,
    };
  }, [analytics.keyCards]);

  // Directly calculate counts from deck if needed
  const { monsterCount, spellCount, trapCount } = useMemo(() => {
    // Use the existing values if they're non-zero
    if (
      analytics.monsterCount > 0 ||
      analytics.spellCount > 0 ||
      analytics.trapCount > 0
    ) {
      return {
        monsterCount: analytics.monsterCount,
        spellCount: analytics.spellCount,
        trapCount: analytics.trapCount,
      };
    }

    // Try to recalculate from deck data
    const deck = analytics.mainDeck || [];
    let monsters = 0;
    let spells = 0;
    let traps = 0;

    deck.forEach((card) => {
      if (card.type && card.type.includes("Monster")) monsters += 1;
      else if (card.type && card.type.includes("Spell")) spells += 1;
      else if (card.type && card.type.includes("Trap")) traps += 1;
    });

    console.log("DEBUG: Recalculated counts:", { monsters, spells, traps });
    return {
      monsterCount: monsters || analytics.monsterCount || 0,
      spellCount: spells || analytics.spellCount || 0,
      trapCount: traps || analytics.trapCount || 0,
    };
  }, [analytics]);

  return (
    <div className="analytics-section">
      <div className="section-header-with-actions">
        <h3>Deck Composition</h3>
      </div>
      <div className="composition-stats">
        <div className="stat-item">
          <span>Monsters</span>
          <span className="stat-value">{monsterCount || 0} cards</span>
        </div>
        <div className="stat-item">
          <span>Spells</span>
          <span className="stat-value">{spellCount || 0} cards</span>
        </div>
        <div className="stat-item">
          <span>Traps</span>
          <span className="stat-value">{trapCount || 0} cards</span>
        </div>
        <div className="stat-item">
          <span>Main Deck</span>
          <span className="stat-value">{analytics.deckSize || 0} cards</span>
        </div>
        <div className="stat-item">
          <span>Extra Deck</span>
          <span className="stat-value">
            {analytics.extraDeckSize || 0}/15 cards
          </span>
        </div>
        <div className="stat-item playset-stat">
          <span>Playsets (3x)</span>
          <span className="stat-value">
            {playsetInfo.count} <small>({playsetInfo.percentage}%)</small>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeckComposition;
