import React, { useState, useMemo } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import "./DrawSimulator.css";

interface DrawSimulatorProps {
  deck: Deck | null;
  onCardSelect: (card: Card) => void;
}

interface SimulationResult {
  hand: Card[];
  timestamp: number;
}

interface ExtendedStatistics {
  totalSimulations: number;
  mostCommonHand: {
    cards: Card[];
    frequency: number;
    percentage: number;
  };
  leastCommonHand: {
    cards: Card[];
    frequency: number;
    percentage: number;
  };
  mostSeenCard: {
    card: Card;
    appearances: number;
    percentage: number;
  };
  leastSeenCard: {
    card: Card;
    appearances: number;
    percentage: number;
  };
  roleStatistics: {
    [key: string]: {
      atLeastOne: number;
      percentage: number;
      averagePerHand: number;
    };
  };
}

const DrawSimulator: React.FC<DrawSimulatorProps> = ({
  deck,
  onCardSelect,
}) => {
  const [handSize, setHandSize] = useState(5);
  const [simulations, setSimulations] = useState(1);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const drawHand = (deckList: Card[], size: number): Card[] => {
    const shuffled = [...deckList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  };

  const simulateDraws = () => {
    if (!deck) return;
    setIsSimulating(true);

    const newResults: SimulationResult[] = [];
    for (let i = 0; i < simulations; i++) {
      newResults.push({
        hand: drawHand(deck.mainDeck, handSize),
        timestamp: Date.now(),
      });
    }

    setResults(newResults);
    setIsSimulating(false);
  };

  const calculateExtendedStatistics = (
    simResults: SimulationResult[]
  ): ExtendedStatistics => {
    const totalSims = simResults.length;
    const handFrequency: Record<string, { count: number; cards: Card[] }> = {};
    const cardAppearances: Record<string, { count: number; card: Card }> = {};
    const roleAppearances: Record<
      string,
      { atLeastOne: number; total: number }
    > = {};

    simResults.forEach((result) => {
      const handKey = result.hand
        .map((c) => c.name)
        .sort()
        .join("||");
      if (!handFrequency[handKey]) {
        handFrequency[handKey] = { count: 0, cards: result.hand };
      }
      handFrequency[handKey].count++;

      result.hand.forEach((card) => {
        if (!cardAppearances[card.name]) {
          cardAppearances[card.name] = { count: 0, card };
        }
        cardAppearances[card.name].count++;

        if (card.roleInfo?.role) {
          if (!roleAppearances[card.roleInfo.role]) {
            roleAppearances[card.roleInfo.role] = { atLeastOne: 0, total: 0 };
          }
          roleAppearances[card.roleInfo.role].total++;
        }
      });

      const rolesInHand = new Set(
        result.hand.map((c) => c.roleInfo?.role).filter(Boolean)
      );
      rolesInHand.forEach((role) => {
        if (role) roleAppearances[role].atLeastOne++;
      });
    });

    const sortedHands = Object.values(handFrequency).sort(
      (a, b) => b.count - a.count
    );
    const mostCommonHand = sortedHands[0];
    const leastCommonHand = sortedHands[sortedHands.length - 1];

    const sortedCards = Object.values(cardAppearances).sort(
      (a, b) => b.count - a.count
    );
    const mostSeenCard = sortedCards[0];
    const leastSeenCard = sortedCards[sortedCards.length - 1];

    const roleStats = Object.entries(roleAppearances).reduce(
      (acc, [role, stats]) => {
        acc[role] = {
          atLeastOne: stats.atLeastOne,
          percentage: (stats.atLeastOne / totalSims) * 100,
          averagePerHand: stats.total / totalSims,
        };
        return acc;
      },
      {} as ExtendedStatistics["roleStatistics"]
    );

    return {
      totalSimulations: totalSims,
      mostCommonHand: {
        cards: mostCommonHand.cards,
        frequency: mostCommonHand.count,
        percentage: (mostCommonHand.count / totalSims) * 100,
      },
      leastCommonHand: {
        cards: leastCommonHand.cards,
        frequency: leastCommonHand.count,
        percentage: (leastCommonHand.count / totalSims) * 100,
      },
      mostSeenCard: {
        card: mostSeenCard.card,
        appearances: mostSeenCard.count,
        percentage: (mostSeenCard.count / totalSims) * 100,
      },
      leastSeenCard: {
        card: leastSeenCard.card,
        appearances: leastSeenCard.count,
        percentage: (leastSeenCard.count / totalSims) * 100,
      },
      roleStatistics: roleStats,
    };
  };

  const statistics = useMemo(() => {
    if (results.length === 0) return null;
    return calculateExtendedStatistics(results);
  }, [results]);

  if (!deck) {
    return <div className="draw-simulator empty">Select a deck first</div>;
  }

  return (
    <div className="draw-simulator">
      <div className="simulator-controls">
        <div className="control-group">
          <label>
            Hand Size:
            <input
              type="number"
              min="1"
              max={deck.mainDeck.length}
              value={handSize}
              onChange={(e) => setHandSize(Number(e.target.value))}
            />
          </label>
          <label>
            Number of Simulations:
            <input
              type="number"
              min="1"
              max="10000"
              value={simulations}
              onChange={(e) => setSimulations(Number(e.target.value))}
            />
          </label>
          <button
            onClick={simulateDraws}
            disabled={isSimulating}
            className="simulate-button"
          >
            {isSimulating ? "Simulating..." : "Simulate Draws"}
          </button>
        </div>
      </div>

      <div className="simulation-results">
        {statistics && (
          <>
            <div className="statistics-section">
              <h3>
                Most Common Opening Hand (
                {statistics.mostCommonHand.percentage.toFixed(1)}%)
              </h3>
              <div className="hand-preview">
                {statistics.mostCommonHand.cards.map((card, index) => (
                  <img
                    key={index}
                    src={getCardImageUrl(card, "small")}
                    alt={card.name}
                    onClick={() => onCardSelect(card)}
                    className="hand-card"
                  />
                ))}
              </div>
            </div>

            <div className="statistics-section">
              <h3>Draw Statistics</h3>
              <div className="stat-grid">
                <div className="stat-box">
                  <h4>Most Seen Card</h4>
                  <p>{statistics.mostSeenCard.card.name}</p>
                  <p>
                    {statistics.mostSeenCard.percentage.toFixed(1)}% of hands
                  </p>
                </div>
                <div className="stat-box">
                  <h4>Least Seen Card</h4>
                  <p>{statistics.leastSeenCard.card.name}</p>
                  <p>
                    {statistics.leastSeenCard.percentage.toFixed(1)}% of hands
                  </p>
                </div>
              </div>
            </div>

            <div className="statistics-section">
              <h3>Role Statistics</h3>
              <div className="role-stats">
                {Object.entries(statistics.roleStatistics).map(
                  ([role, stats]) => (
                    <div key={role} className="role-stat-item">
                      <h4>{role}</h4>
                      <p>At least one: {stats.percentage.toFixed(1)}%</p>
                      <p>Average per hand: {stats.averagePerHand.toFixed(2)}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DrawSimulator;
