import React, { useState, useMemo, useEffect } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { YGOGameUtils } from "ygo-core";
import {
  calculateDrawProbability,
  calculateDrawAtLeastXCopies,
  calculateComboHandProbability,
} from "../../utils/probabilityUtils";
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
  mostSeenCards: Array<{
    card: Card;
    appearances: number;
    percentage: number;
  }>;
  leastSeenCards: Array<{
    card: Card;
    appearances: number;
    percentage: number;
  }>;
  handFrequency: Array<{
    key: string;
    cards: Card[];
    count: number;
    percentage: number;
  }>;
  cardCombinations: {
    [size: number]: Array<{
      cards: Card[];
      count: number;
      percentage: number;
    }>;
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
  const [expandedTables, setExpandedTables] = useState({
    mostSeen: false,
    leastSeen: false,
    commonHand: false,
    combinationsPanel: false, // Main panel collapsed by default
    combinations: {}, // We'll initialize this dynamically
  });

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

    // Make a deep copy of the selected card to avoid reference issues
    const cardToAdd = { ...selectedCard };

    // Create a new array of groups
    const updatedGroups = [...wantedCardGroups];

    if (selectedGroupId >= 0 && selectedGroupId < updatedGroups.length) {
      // Add the card to the existing group
      updatedGroups[selectedGroupId] = {
        ...updatedGroups[selectedGroupId],
        cards: [...updatedGroups[selectedGroupId].cards, cardToAdd],
      };
    } else {
      // Create a new group if somehow the selected group doesn't exist
      updatedGroups.push({
        cards: [cardToAdd],
        copies: wantedCopies,
        relation: "OR",
      });
    }

    setWantedCardGroups(updatedGroups);
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

  const generateCombinations = (array: Card[], size: number): Card[][] => {
    if (size > array.length || size <= 0) return [];
    if (size === array.length) return [array];
    if (size === 1) return array.map((item) => [item]);

    const combinations: Card[][] = [];
    array.forEach((item, index) => {
      const smallerCombinations = generateCombinations(
        array.slice(index + 1),
        size - 1
      );
      smallerCombinations.forEach((combo) =>
        combinations.push([item, ...combo])
      );
    });
    return combinations;
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

    // For tracking card combinations
    const combinationsMap: Record<
      number,
      Record<string, { cards: Card[]; count: number }>
    > = {};

    // Initialize combinations map based on hand size (we'll track combinations from size 2 up to handSize-1)
    for (let size = 2; size < handSize; size++) {
      combinationsMap[size] = {};
    }

    simResults.forEach((result) => {
      const handKey = result.hand
        .map((c) => c.name)
        .sort()
        .join("||");
      if (!handFrequency[handKey]) {
        handFrequency[handKey] = { count: 0, cards: result.hand };
      }
      handFrequency[handKey].count++;

      // Create a set to track which roles appeared at least once in this hand
      const rolesInHand = new Set<string>();

      // Track the cards in this hand
      result.hand.forEach((card) => {
        if (!cardAppearances[card.name]) {
          cardAppearances[card.name] = { count: 0, card };
        }
        cardAppearances[card.name].count++;

        // Update to use roleInfo.roles (plural) array instead of roleInfo.role
        if (card.roleInfo?.roles && card.roleInfo.roles.length > 0) {
          card.roleInfo.roles.forEach((role) => {
            if (!roleAppearances[role]) {
              roleAppearances[role] = { atLeastOne: 0, total: 0 };
            }
            roleAppearances[role].total++;

            // Add to the set of roles found in this hand
            rolesInHand.add(role);
          });
        }
      });

      // Generate and count all possible combinations of different sizes
      for (let size = 2; size < handSize; size++) {
        const combinations = generateCombinations(result.hand, size);
        combinations.forEach((combo) => {
          const comboKey = combo
            .map((c) => c.name)
            .sort()
            .join("||");
          if (!combinationsMap[size][comboKey]) {
            combinationsMap[size][comboKey] = { cards: combo, count: 0 };
          }
          combinationsMap[size][comboKey].count++;
        });
      }

      // Increment atLeastOne counter for each unique role found in this hand
      rolesInHand.forEach((role) => {
        roleAppearances[role].atLeastOne++;
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

    // Get top 5 most seen cards
    const mostSeenCards = sortedCards.slice(0, 5).map((item) => ({
      card: item.card,
      appearances: item.count,
      percentage: (item.count / totalSims) * 100,
    }));

    // Get bottom 5 least seen cards
    const leastSeenCards = sortedCards
      .slice(-5)
      .reverse()
      .map((item) => ({
        card: item.card,
        appearances: item.count,
        percentage: (item.count / totalSims) * 100,
      }));

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

    // Process hand frequency data for the top 5 most common hands
    const processedHandFrequency = Object.entries(handFrequency)
      .map(([key, data]) => ({
        key,
        cards: data.cards,
        count: data.count,
        percentage: (data.count / totalSims) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Process card combinations for each size
    const cardCombinations: ExtendedStatistics["cardCombinations"] = {};

    for (let size = 2; size < handSize; size++) {
      const combinations = Object.values(combinationsMap[size])
        .map((combo) => ({
          cards: combo.cards,
          count: combo.count,
          percentage: (combo.count / totalSims) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Get top 5 combinations for each size

      cardCombinations[size] = combinations;
    }

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
      mostSeenCards,
      leastSeenCards,
      handFrequency: processedHandFrequency,
      roleStatistics: roleStats,
      wantedCardsSuccessRate: (wantedCardsSuccessCount / totalSims) * 100,
      wantedCardsSuccessCount,
      cardCombinations,
    };
  };

  const statistics = useMemo(() => {
    if (results.length === 0) return null;
    return calculateExtendedStatistics(results);
  }, [results]);

  // Fix the self-reference issue in theoreticalProbabilities useMemo
  const theoreticalProbabilities = useMemo(() => {
    if (!deck) return null;

    const deckSize = deck.mainDeck.length;

    // Calculate card probabilities
    const cardProbabilities = uniqueCards.map((card) => ({
      card,
      probability: calculateDrawProbability(
        deckSize,
        card.totalCopies,
        handSize // Just use handSize directly from state
      ),
      exactOneProb:
        calculateDrawAtLeastXCopies(deckSize, card.totalCopies, handSize, 1) -
        calculateDrawAtLeastXCopies(deckSize, card.totalCopies, handSize, 2),
      atLeastTwoProb: calculateDrawAtLeastXCopies(
        deckSize,
        card.totalCopies,
        handSize,
        2
      ),
    }));

    // Sort by probability descending
    return cardProbabilities.sort((a, b) => b.probability - a.probability);
  }, [deck, handSize, uniqueCards]);

  useEffect(() => {
    if (statistics && Object.keys(statistics.cardCombinations).length > 0) {
      const combinationsExpanded = {};

      // Set all combination sizes to be expanded by default
      Object.keys(statistics.cardCombinations).forEach((size) => {
        combinationsExpanded[size] = true;
      });

      setExpandedTables((prev) => ({
        ...prev,
        combinations: combinationsExpanded,
      }));
    }
  }, [statistics]);

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

                  // If a card is selected and there's no group selected but groups exist,
                  // automatically select the first group
                  if (
                    card &&
                    selectedGroupId === null &&
                    wantedCardGroups.length > 0
                  ) {
                    setSelectedGroupId(0);
                  }
                }}
                disabled={
                  selectedGroupId === null && wantedCardGroups.length === 0
                }
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
                type="button"
              >
                {selectedCard
                  ? `Add to Group ${
                      selectedGroupId !== null ? selectedGroupId + 1 : ""
                    }`
                  : "Select a card"}
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
                          src={getCardImageUrl(card.id, "small")}
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
              <div
                className="hand-header clickable"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    commonHand: !expandedTables.commonHand,
                  })
                }
              >
                <h3>
                  Most Common Opening Hand (
                  {statistics.mostCommonHand.frequency} times -{" "}
                  {statistics.mostCommonHand.percentage.toFixed(1)}%)
                  <span className="toggle-indicator">
                    {expandedTables.commonHand ? "▲" : "▼"}
                  </span>
                </h3>
              </div>

              <div className="hand-preview">
                {statistics.mostCommonHand.cards.map((card, index) => (
                  <img
                    key={index}
                    src={getCardImageUrl(card.id, "small")}
                    alt={card.name}
                    onClick={() => onCardSelect(card)}
                    className="hand-card"
                  />
                ))}
              </div>

              {/* New expanded table for most common hands */}
              {expandedTables.commonHand && (
                <div className="card-statistics-tables">
                  <div className="card-statistics-table">
                    <h4>Most Common Opening Hands</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Frequency</th>
                          <th>Percentage</th>
                          <th>Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.handFrequency.map((data, index) => (
                          <tr key={`hand-${index}`}>
                            <td>{data.count} times</td>
                            <td>{data.percentage.toFixed(1)}%</td>
                            <td className="hand-cards-preview">
                              {data.cards.map((card, cardIndex) => (
                                <img
                                  key={`${data.key}-${cardIndex}`}
                                  src={getCardImageUrl(card.id, "small")}
                                  alt={card.name}
                                  onClick={() => onCardSelect(card)}
                                  className="table-card-image"
                                  title={card.name}
                                />
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                <div
                  className="stat-box clickable"
                  onClick={() =>
                    setExpandedTables({
                      ...expandedTables,
                      mostSeen: !expandedTables.mostSeen,
                    })
                  }
                >
                  <h4>Most Seen Card</h4>
                  <div className="stat-card-preview">
                    <img
                      src={getCardImageUrl(
                        statistics.mostSeenCard.card.id,
                        "small"
                      )}
                      alt={statistics.mostSeenCard.card.name}
                      className="stat-card-image"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggle when clicking directly on image
                        onCardSelect(statistics.mostSeenCard.card);
                      }}
                    />
                    <div className="stat-card-info">
                      <p className="stat-card-name">
                        {statistics.mostSeenCard.card.name}
                      </p>
                      <p className="stat-card-frequency">
                        {statistics.mostSeenCard.appearances} times (
                        {statistics.mostSeenCard.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="toggle-indicator">
                      {expandedTables.mostSeen ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                <div
                  className="stat-box clickable"
                  onClick={() =>
                    setExpandedTables({
                      ...expandedTables,
                      leastSeen: !expandedTables.leastSeen,
                    })
                  }
                >
                  <h4>Least Seen Card</h4>
                  <div className="stat-card-preview">
                    <img
                      src={getCardImageUrl(
                        statistics.leastSeenCard.card.id,
                        "small"
                      )}
                      alt={statistics.leastSeenCard.card.name}
                      className="stat-card-image"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggle when clicking directly on image
                        onCardSelect(statistics.leastSeenCard.card);
                      }}
                    />
                    <div className="stat-card-info">
                      <p className="stat-card-name">
                        {statistics.leastSeenCard.card.name}
                      </p>
                      <p className="stat-card-frequency">
                        {statistics.leastSeenCard.appearances} times (
                        {statistics.leastSeenCard.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="toggle-indicator">
                      {expandedTables.leastSeen ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible tables */}
              {expandedTables.mostSeen && (
                <div className="card-statistics-tables">
                  <div className="card-statistics-table">
                    <h4>Top Cards by Frequency</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Image</th>
                          <th>Appearances</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.mostSeenCards.map((item, index) => (
                          <tr key={`most-${index}`}>
                            <td>{item.card.name}</td>
                            <td>
                              <img
                                src={getCardImageUrl(item.card.id, "small")}
                                alt={item.card.name}
                                onClick={() => onCardSelect(item.card)}
                                className="table-card-image"
                              />
                            </td>
                            <td>{item.appearances}</td>
                            <td>{item.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {expandedTables.leastSeen && (
                <div className="card-statistics-tables">
                  <div className="card-statistics-table">
                    <h4>Least Common Cards</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Image</th>
                          <th>Appearances</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.leastSeenCards.map((item, index) => (
                          <tr key={`least-${index}`}>
                            <td>{item.card.name}</td>
                            <td>
                              <img
                                src={getCardImageUrl(item.card.id, "small")}
                                alt={item.card.name}
                                onClick={() => onCardSelect(item.card)}
                                className="table-card-image"
                              />
                            </td>
                            <td>{item.appearances}</td>
                            <td>{item.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

            <div className="statistics-section">
              <div
                className="hand-header clickable"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    combinationsPanel: !expandedTables.combinationsPanel,
                  })
                }
              >
                <h3>Card Combinations</h3>
                <span className="toggle-indicator">
                  {expandedTables.combinationsPanel ? "▲" : "▼"}
                </span>
              </div>
              {expandedTables.combinationsPanel && (
                <>
                  <p>
                    Most common card combinations appearing in opening hands:
                  </p>
                  {Object.entries(statistics.cardCombinations).map(
                    ([size, combinations]) => (
                      <div
                        key={`combo-size-${size}`}
                        className="card-statistics-table"
                      >
                        <div
                          className="hand-header clickable"
                          onClick={() =>
                            setExpandedTables({
                              ...expandedTables,
                              combinations: {
                                ...expandedTables.combinations,
                                [size]: !expandedTables.combinations[size],
                              },
                            })
                          }
                        >
                          <h4>Most Common {size}-Card Combinations</h4>
                          <span className="toggle-indicator">
                            {expandedTables.combinations[size] ? "▲" : "▼"}
                          </span>
                        </div>
                        {expandedTables.combinations[size] && (
                          <>
                            {combinations.length > 0 ? (
                              <table>
                                <thead>
                                  <tr>
                                    <th>Frequency</th>
                                    <th>Percentage</th>
                                    <th>Cards</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {combinations.map((combo, index) => (
                                    <tr key={`combo-${size}-${index}`}>
                                      <td>{combo.count} times</td>
                                      <td>{combo.percentage.toFixed(1)}%</td>
                                      <td className="hand-cards-preview">
                                        {combo.cards.map((card, cardIndex) => (
                                          <img
                                            key={`combo-${size}-${index}-${cardIndex}`}
                                            src={getCardImageUrl(
                                              card.id,
                                              "small"
                                            )}
                                            alt={card.name}
                                            onClick={() => onCardSelect(card)}
                                            className="table-card-image"
                                            title={card.name}
                                          />
                                        ))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p>
                                No data available for {size}-card combinations
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </>
        )}

        {statistics && theoreticalProbabilities && (
          <div className="statistics-section">
            <h3>Theoretical Probabilities</h3>
            <div className="card-statistics-tables">
              <div className="card-statistics-table">
                <h4>Card Draw Probabilities</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Image</th>
                      <th>Copies</th>
                      <th>Any Copy</th>
                      <th>Exactly 1</th>
                      <th>2+ Copies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theoreticalProbabilities
                      .slice(0, 10)
                      .map((item, index) => (
                        <tr key={`prob-${index}`}>
                          <td>{item.card.name}</td>
                          <td>
                            <img
                              src={getCardImageUrl(item.card.id, "small")}
                              alt={item.card.name}
                              onClick={() => onCardSelect(item.card)}
                              className="table-card-image"
                            />
                          </td>
                          <td>{item.card.totalCopies}</td>
                          <td>{item.probability.toFixed(1)}%</td>
                          <td>{item.exactOneProb.toFixed(1)}%</td>
                          <td>{item.atLeastTwoProb.toFixed(1)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawSimulator;
