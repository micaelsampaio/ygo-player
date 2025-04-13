import React, { useState, useMemo } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { YGOGameUtils } from "ygo-core";
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
  wantedCardsSuccessRate: number;
  wantedCardsSuccessCount: number;
}

interface WantedCards {
  card: Card;
  copies: number;
}

interface WantedCardGroup {
  cards: Card[];
  copies: number;
  relation: "AND" | "OR";
}

const DrawSimulator: React.FC<DrawSimulatorProps> = ({
  deck,
  onCardSelect,
}) => {
  const [handSize, setHandSize] = useState(5);
  const [simulations, setSimulations] = useState(1);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [wantedCardGroups, setWantedCardGroups] = useState<WantedCardGroup[]>(
    []
  );
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [wantedCopies, setWantedCopies] = useState(1);
  const [currentGroupId, setCurrentGroupId] = useState<number>(0);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [simulationMode, setSimulationMode] = useState<"random" | "specific">(
    "random"
  );

  const uniqueCards = useMemo(() => {
    if (!deck) return [];
    const cardMap = new Map();
    deck.mainDeck.forEach((card) => {
      if (!cardMap.has(card.id)) {
        const copies = deck.mainDeck.filter((c) => c.id === card.id).length;
        cardMap.set(card.id, { ...card, totalCopies: copies });
      }
    });
    return Array.from(cardMap.values());
  }, [deck]);

  const drawHand = (deckList: Card[], size: number): Card[] => {
    const deckCopy = [...deckList];
    YGOGameUtils.shuffleCards(deckCopy);
    return deckCopy.slice(0, size);
  };

  const addWantedCard = () => {
    if (!selectedCard || selectedGroupId === null) return;

    const groupIndex = wantedCardGroups.findIndex(
      (_, index) => index === selectedGroupId
    );
    if (groupIndex !== -1) {
      const updatedGroups = [...wantedCardGroups];
      updatedGroups[groupIndex].cards.push(selectedCard);
      setWantedCardGroups(updatedGroups);
    } else {
      setWantedCardGroups([
        ...wantedCardGroups,
        { cards: [selectedCard], copies: wantedCopies, relation: "AND" },
      ]);
    }
    setSelectedCard(null);
    setWantedCopies(1);
  };

  const removeWantedCard = (groupId: number, cardId: number) => {
    const updatedGroups = wantedCardGroups
      .map((group, index) => {
        if (index === groupId) {
          return {
            ...group,
            cards: group.cards.filter((card) => card.id !== cardId),
          };
        }
        return group;
      })
      .filter((group) => group.cards.length > 0);
    setWantedCardGroups(updatedGroups);
  };

  const simulateDraws = () => {
    if (!deck) return;
    setIsSimulating(true);

    const newResults: SimulationResult[] = [];
    let successCount = 0;

    for (let i = 0; i < simulations; i++) {
      const hand = drawHand(deck.mainDeck, handSize);
      newResults.push({
        hand,
        timestamp: Date.now(),
      });

      const isSuccessful = wantedCardGroups.every((group) => {
        if (group.relation === "AND") {
          return group.cards.every((card) => {
            const drawnCopies = hand.filter((c) => c.id === card.id).length;
            return drawnCopies >= group.copies;
          });
        } else if (group.relation === "OR") {
          return group.cards.some((card) => {
            const drawnCopies = hand.filter((c) => c.id === card.id).length;
            return drawnCopies >= group.copies;
          });
        }
        return false;
      });

      if (isSuccessful) successCount++;
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
    let wantedCardsSuccessCount = 0;

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

      const isSuccessful = wantedCardGroups.every((group) => {
        if (group.relation === "AND") {
          return group.cards.every((card) => {
            const drawnCopies = result.hand.filter(
              (c) => c.id === card.id
            ).length;
            return drawnCopies >= group.copies;
          });
        } else if (group.relation === "OR") {
          return group.cards.some((card) => {
            const drawnCopies = result.hand.filter(
              (c) => c.id === card.id
            ).length;
            return drawnCopies >= group.copies;
          });
        }
        return false;
      });

      if (isSuccessful) wantedCardsSuccessCount++;
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
      wantedCardsSuccessRate: (wantedCardsSuccessCount / totalSims) * 100,
      wantedCardsSuccessCount,
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
        <div className="simulation-mode-toggle">
          <button
            className={simulationMode === "random" ? "active" : ""}
            onClick={() => setSimulationMode("random")}
          >
            Random Draw
          </button>
          <button
            className={simulationMode === "specific" ? "active" : ""}
            onClick={() => setSimulationMode("specific")}
          >
            Specific Cards
          </button>
        </div>

        <div className="control-group">
          <label>
            Hand Size:
            <input
              type="number"
              min="1"
              max={deck?.mainDeck.length || 40}
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
        </div>

        {simulationMode === "specific" && (
          <div className="wanted-cards-section">
            <h4>Select Cards to Draw</h4>

            <div className="group-controls">
              <button
                className="new-group-btn"
                onClick={() => {
                  setWantedCardGroups([
                    ...wantedCardGroups,
                    { cards: [], copies: 1, relation: "OR" },
                  ]);
                  setSelectedGroupId(wantedCardGroups.length);
                  setCurrentGroupId(currentGroupId + 1);
                }}
              >
                New Card Group
              </button>

              <div className="group-tabs">
                {wantedCardGroups.map((group, idx) => (
                  <button
                    key={idx}
                    className={`group-tab ${
                      selectedGroupId === idx ? "active" : ""
                    }`}
                    onClick={() => setSelectedGroupId(idx)}
                  >
                    Group {idx + 1} ({group.relation})
                  </button>
                ))}
              </div>
            </div>

            {selectedGroupId !== null && (
              <div className="active-group-controls">
                <div className="relation-control">
                  <label>Relation:</label>
                  <select
                    value={wantedCardGroups[selectedGroupId]?.relation || "AND"}
                    onChange={(e) => {
                      const updatedGroups = [...wantedCardGroups];
                      updatedGroups[selectedGroupId].relation = e.target
                        .value as "AND" | "OR";
                      setWantedCardGroups(updatedGroups);
                    }}
                  >
                    <option value="AND">AND (need all cards)</option>
                    <option value="OR">OR (need any card)</option>
                  </select>
                </div>

                <div className="copies-control">
                  <label>Copies needed:</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={wantedCardGroups[selectedGroupId]?.copies || 1}
                    onChange={(e) => {
                      const updatedGroups = [...wantedCardGroups];
                      updatedGroups[selectedGroupId].copies = Number(
                        e.target.value
                      );
                      setWantedCardGroups(updatedGroups);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="wanted-cards-input">
              <select
                value={selectedCard?.id || ""}
                onChange={(e) => {
                  const card = uniqueCards.find(
                    (c) => c.id.toString() === e.target.value
                  );
                  setSelectedCard(card || null);
                }}
                disabled={selectedGroupId === null}
              >
                <option value="">Select a card...</option>
                {uniqueCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.totalCopies}x)
                  </option>
                ))}
              </select>

              <button
                className="add-card-btn"
                onClick={addWantedCard}
                disabled={!selectedCard || selectedGroupId === null}
              >
                Add to Group{" "}
                {selectedGroupId !== null ? selectedGroupId + 1 : ""}
              </button>
            </div>

            <div className="wanted-cards-list">
              {wantedCardGroups.map((group, groupId) => (
                <div
                  key={groupId}
                  className={`wanted-card-group ${
                    selectedGroupId === groupId ? "active" : ""
                  }`}
                >
                  <div className="group-header">
                    <h5>
                      Group {groupId + 1} ({group.relation})
                    </h5>
                    <span className="copies-label">
                      Need {group.copies}{" "}
                      {group.relation === "AND" ? "of each" : "of any"}
                    </span>
                    <button
                      className="edit-group-btn"
                      onClick={() => setSelectedGroupId(groupId)}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="cards-container">
                    {group.cards.map((card) => (
                      <div key={card.id} className="wanted-card">
                        <img
                          src={getCardImageUrl(card, "small")}
                          alt={card.name}
                          className="wanted-card-image"
                          onClick={() => onCardSelect(card)}
                        />
                        <div className="wanted-card-info">
                          <span className="wanted-card-name">{card.name}</span>
                        </div>
                        <button
                          className="remove-card-btn"
                          onClick={() => removeWantedCard(groupId, card.id)}
                          title="Remove card"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {group.cards.length === 0 && (
                      <div className="empty-group-message">
                        No cards added to this group yet
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {wantedCardGroups.length === 0 && (
                <div className="no-groups-message">
                  Click "New Card Group" to start building your simulation
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={simulateDraws}
          disabled={
            isSimulating ||
            (simulationMode === "specific" && wantedCardGroups.length === 0)
          }
          className="simulate-button"
        >
          {isSimulating ? "Simulating..." : "Simulate Draws"}
        </button>
      </div>

      <div className="simulation-results">
        {statistics && (
          <>
            <div className="statistics-section">
              <h3>
                Most Common Opening Hand ({statistics.mostCommonHand.frequency}{" "}
                times - {statistics.mostCommonHand.percentage.toFixed(1)}%)
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
              {wantedCardGroups.length > 0 && (
                <div className="wanted-cards-stats">
                  <h4>Wanted Cards</h4>
                  <p>
                    Probability of drawing all wanted cards:{" "}
                    {statistics.wantedCardsSuccessRate.toFixed(1)}% (
                    {statistics.wantedCardsSuccessCount} in{" "}
                    {statistics.totalSimulations} hands)
                  </p>
                </div>
              )}
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
