import React, { useState, useMemo, useEffect } from "react";
import { Card, Deck } from "../../types";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { YGOGameUtils } from "ygo-core";
import {
  calculateDrawProbability,
  calculateDrawAtLeastXCopies,
  calculateComboHandProbability,
} from "../../utils/probabilityUtils";
import { exportDrawSimulationToPdf } from "../../utils/pdfExport";
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

// Function to export simulation data to CSV
const exportToCSV = (allHands: SimulationResult[], deckName: string) => {
  if (allHands.length === 0) return;

  console.log("Exporting CSV for", allHands.length, "simulated hands");

  // Get a set of all unique card names across all hands
  const uniqueCardNames = new Set<string>();
  allHands.forEach((result) => {
    result.hand.forEach((card) => {
      uniqueCardNames.add(card.name);
    });
  });

  // Convert to array and sort alphabetically for consistent column order
  const cardNamesArray = Array.from(uniqueCardNames).sort();

  // Build CSV content
  let csvContent = "Simulation #," + cardNamesArray.join(",") + "\r\n";

  // Create a row for each simulation
  allHands.forEach((result, index) => {
    // Start with simulation number
    let row = `${index + 1},`;

    // For each card in our master list, check if it's in this hand
    cardNamesArray.forEach((cardName) => {
      // Count how many copies of this card are in the hand
      const count = result.hand.filter((card) => card.name === cardName).length;
      row += (count > 0 ? count : "") + ",";
    });

    // Remove trailing comma and add new line
    csvContent += row.slice(0, -1) + "\r\n";
  });

  // Use Blob instead of data URI for better browser support with larger files
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create a URL for the blob
  const url = window.URL.createObjectURL(blob);

  // Create a link to download the file
  const link = document.createElement("a");
  const filename = `${deckName.replace(
    /[/\\?%*:|"<>]/g,
    "-"
  )}_simulation_matrix.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  // Append to document, trigger download, and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log("CSV export complete");
};

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
    combinationsPanel: false,
    combinations: {}, // We'll initialize this dynamically
    theoreticalProb: false, // Changed from true to false to be collapsed by default
    showAllCards: false,
    allHands: false,
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
        appearances: mostSeenCard.count,
        percentage: (mostSeenCard.count / totalSims) * 100,
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

  // Calculate theoretical probability for specific card groups
  const theoreticalGroupProbability = useMemo(() => {
    if (!deck || wantedCardGroups.length === 0) return null;

    const deckSize = deck.mainDeck.length;

    const groupProbabilities = wantedCardGroups.map((group) => {
      let probability = 0;

      if (group.relation === "AND") {
        // For AND relations, we need all cards to be drawn
        const individualProbs = group.cards.map((card) => {
          // Find the total copies of this card in the deck
          const totalCardCopies = deck.mainDeck.filter(
            (c) => c.id === card.id
          ).length;
          // Calculate probability of drawing at least the required copies
          return (
            calculateDrawAtLeastXCopies(
              deckSize,
              totalCardCopies,
              handSize,
              group.copies
            ) / 100
          );
        });

        // For AND relation, multiply all individual probabilities
        probability =
          individualProbs.reduce((acc, prob) => acc * prob, 1) * 100;
      } else if (group.relation === "OR") {
        // For OR relations, we need at least one of the cards to be drawn
        const cardIds = new Set(group.cards.map((card) => card.id));
        const totalCopies = Array.from(cardIds).reduce((total, cardId) => {
          return total + deck.mainDeck.filter((c) => c.id === cardId).length;
        }, 0);

        // Calculate probability of drawing at least the required copies from any of these cards
        probability = calculateDrawProbability(deckSize, totalCopies, handSize);
      }

      return {
        groupId: wantedCardGroups.indexOf(group),
        cards: group.cards,
        copies: group.copies,
        relation: group.relation,
        probability,
      };
    });

    // Calculate overall probability (all groups must succeed)
    const overallProbability =
      groupProbabilities.reduce(
        (acc, group) => acc * (group.probability / 100),
        1
      ) * 100;

    return {
      groups: groupProbabilities,
      overallProbability,
    };
  }, [deck, wantedCardGroups, handSize]);

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
    <>
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

                {selectedGroupId !== null && (
                  <div className="active-group-controls">
                    <div className="relation-control">
                      <label>Relation:</label>
                      <select
                        value={
                          wantedCardGroups[selectedGroupId]?.relation || "AND"
                        }
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

                {wantedCardGroups.length > 0 && (
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
                      disabled={selectedGroupId === null}
                    >
                      <option value="">Select a card...</option>
                      {uniqueCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} ({card.totalCopies}x)
                        </option>
                      ))}
                    </select>

                    {selectedCard && selectedGroupId !== null && (
                      <div className="add-card-btn-container">
                        <button
                          className="add-card-btn"
                          onClick={addWantedCard}
                          type="button"
                        >
                          Add to Group {selectedGroupId + 1}
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                              <span className="wanted-card-name">
                                {card.name}
                              </span>
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
            </div>
          )}

          <div className="simulation-buttons">
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

            {statistics && results.length > 0 && (
              <>
                <button
                  onClick={() =>
                    exportToCSV(results, deck?.name || "Unknown Deck")
                  }
                  className="export-csv-button"
                >
                  Export CSV
                </button>
                <button
                  onClick={() =>
                    exportDrawSimulationToPdf(deck, results, {
                      ...statistics,
                      theoreticalProbabilities: theoreticalProbabilities || [], // Include the full theoretical probabilities data
                      showAllTheoreticalProbabilities: true, // Force showing all probabilities in PDF
                    })
                  }
                  className="export-pdf-button"
                >
                  Export PDF
                </button>
              </>
            )}
          </div>
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
                    {statistics.mostCommonHand.percentage.toFixed(3)}%)
                    <span className="toggle-indicator">
                      {expandedTables.commonHand ? "▲" : "▼"}
                    </span>
                  </h3>
                </div>

                {/* Add explanation for the Most Common Hand section */}
                <div className="probability-explanation">
                  <p>
                    This section shows the most frequently drawn hand in your
                    simulations. It helps identify which card combinations
                    appear together most often.
                  </p>
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
                            <th>Hand</th>
                            <th>Frequency</th>
                            <th>Percentage</th>
                            <th>Probability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statistics.handFrequency.map((handData, index) => {
                            // Calculate theoretical probability for this exact hand
                            let probability = 0;
                            if (deck) {
                              const deckSize = deck.mainDeck.length;
                              const cardCopies = handData.cards.reduce(
                                (counts, card) => {
                                  if (!counts[card.id]) counts[card.id] = 0;
                                  counts[card.id]++;
                                  return counts;
                                },
                                {}
                              );

                              let exactHandProb = 1;
                              const handSize = handData.cards.length;
                              let remainingCards = deckSize;
                              let remainingHandSize = handSize;

                              // For each unique card in the hand
                              Object.entries(cardCopies).forEach(
                                ([cardId, count]) => {
                                  const totalCardCopies = deck.mainDeck.filter(
                                    (c) => c.id === parseInt(cardId)
                                  ).length;

                                  for (let i = 0; i < count; i++) {
                                    exactHandProb *=
                                      (totalCardCopies - i) /
                                      (remainingCards - i);
                                    remainingHandSize--;
                                  }
                                  remainingCards -= count;
                                }
                              );

                              // Calculate probability for remaining slots
                              if (remainingHandSize > 0) {
                                for (let i = 0; i < remainingHandSize; i++) {
                                  exactHandProb *=
                                    (remainingCards - i) /
                                    (deckSize - handSize + i + 1);
                                }
                              }

                              probability = exactHandProb * 100; // Convert to percentage
                            }

                            return (
                              <tr key={`hand-${index}`}>
                                <td className="hand-cards-preview">
                                  {handData.cards.map((card, cardIndex) => (
                                    <img
                                      key={`hand-card-${index}-${cardIndex}`}
                                      src={getCardImageUrl(card.id, "small")}
                                      alt={card.name}
                                      onClick={() => onCardSelect(card)}
                                      className="table-card-image"
                                      title={card.name}
                                    />
                                  ))}
                                </td>
                                <td>{handData.count} times</td>
                                <td>{handData.percentage.toFixed(1)}%</td>
                                <td>{probability.toFixed(6)}%</td>
                              </tr>
                            );
                          })}
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
                      {statistics.wantedCardsSuccessRate.toFixed(3)}% (
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
                      {/* Add explanation for Most Seen Cards section */}
                      <div className="probability-explanation">
                        <p>
                          This section shows which cards appear most frequently
                          in your opening hands. Higher appearance rates than
                          theoretical probability may indicate biases in your
                          deck structure.
                        </p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Card</th>
                            <th>Image</th>
                            <th>Appearances</th>
                            <th>Percentage</th>
                            <th>Probability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statistics.mostSeenCards.map((item, index) => {
                            // Calculate the theoretical probability
                            let probability = 0;
                            if (deck && item.card) {
                              const deckSize = deck.mainDeck.length;
                              const totalCopies = deck.mainDeck.filter(
                                (c) => c.id === item.card.id
                              ).length;
                              probability = calculateDrawProbability(
                                deckSize,
                                totalCopies,
                                handSize
                              );
                            }

                            return (
                              <tr key={index}>
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
                                <td>{probability.toFixed(2)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {expandedTables.leastSeen && (
                  <div className="card-statistics-tables">
                    <div className="card-statistics-table">
                      <h4>Least Common Cards</h4>
                      {/* Add explanation for Least Seen Cards section */}
                      <div className="probability-explanation">
                        <p>
                          This section shows which cards appear least frequently
                          in your opening hands. Lower rates may indicate
                          potential bottlenecks in accessing key cards.
                        </p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Card</th>
                            <th>Image</th>
                            <th>Appearances</th>
                            <th>Percentage</th>
                            <th>Probability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statistics.leastSeenCards.map((item, index) => {
                            // Calculate the theoretical probability
                            let probability = 0;
                            if (deck && item.card) {
                              const deckSize = deck.mainDeck.length;
                              const totalCopies = deck.mainDeck.filter(
                                (c) => c.id === item.card.id
                              ).length;
                              probability = calculateDrawProbability(
                                deckSize,
                                totalCopies,
                                handSize
                              );
                            }

                            return (
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
                                <td>{probability.toFixed(2)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="statistics-section">
                <h3>Role Statistics</h3>
                {/* Add explanation for Role Statistics section */}
                <div className="probability-explanation">
                  <p>
                    This section analyzes the probability of drawing cards with
                    specific roles in your opening hand, helping you evaluate
                    the balance of different card functions in your deck.
                  </p>
                </div>
                <div className="role-stats">
                  {Object.entries(statistics.roleStatistics).map(
                    ([role, stats]) => (
                      <div key={role} className="role-stat-item">
                        <h4>{role}</h4>
                        <p>At least one: {stats.percentage.toFixed(1)}%</p>
                        <p>
                          Average per hand: {stats.averagePerHand.toFixed(2)}
                        </p>
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
                {/* Always show the explanation even when collapsed */}
                <div className="probability-explanation">
                  <p>
                    This section analyzes which specific card combinations
                    appear together most frequently in your opening hands,
                    helping you identify synergistic patterns.
                  </p>
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
                                      <th>Probability</th>
                                      <th>Cards</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {combinations.map((combo, index) => {
                                      // Calculate the theoretical probability for this combination
                                      let combinationProbability = 0;

                                      if (deck) {
                                        const deckSize = deck.mainDeck.length;
                                        // Get all unique cards in this combination
                                        const uniqueCards = new Map();
                                        combo.cards.forEach((card) => {
                                          if (!uniqueCards.has(card.id)) {
                                            const totalCopies =
                                              deck.mainDeck.filter(
                                                (c) => c.id === card.id
                                              ).length;
                                            uniqueCards.set(card.id, {
                                              card,
                                              totalCopies,
                                              copiesInCombo: 1,
                                            });
                                          } else {
                                            const cardInfo = uniqueCards.get(
                                              card.id
                                            );
                                            cardInfo.copiesInCombo++;
                                            uniqueCards.set(
                                              cardInfo.card.id,
                                              cardInfo
                                            );
                                          }
                                        });

                                        // Calculate probability of drawing this exact combination
                                        // This is a simplified approximation that doesn't account for order
                                        let probability = 1;
                                        let totalProb = 0;

                                        // For combinations, we use a different approach -
                                        // probability of drawing each card independently
                                        if (Number(size) <= 3) {
                                          // For small combinations
                                          uniqueCards.forEach((cardInfo) => {
                                            const p =
                                              calculateDrawProbability(
                                                deckSize,
                                                cardInfo.totalCopies,
                                                handSize
                                              ) / 100; // Convert from percentage to fraction
                                            probability *= p;
                                          });
                                          totalProb = probability * 100; // Convert back to percentage
                                        } else {
                                          // For larger combinations, use approximation
                                          totalProb =
                                            Math.pow(0.5, Number(size) - 1) *
                                            100;
                                        }

                                        combinationProbability = totalProb;
                                      }

                                      return (
                                        <tr key={`combo-${size}-${index}`}>
                                          <td>{combo.count} times</td>
                                          <td>
                                            {combo.percentage.toFixed(1)}%
                                          </td>
                                          <td>
                                            {combinationProbability.toFixed(4)}%
                                          </td>
                                          <td className="hand-cards-preview">
                                            {combo.cards.map(
                                              (card, cardIndex) => (
                                                <img
                                                  key={`combo-${size}-${index}-${cardIndex}`}
                                                  src={getCardImageUrl(
                                                    card.id,
                                                    "small"
                                                  )}
                                                  alt={card.name}
                                                  onClick={() =>
                                                    onCardSelect(card)
                                                  }
                                                  className="table-card-image"
                                                  title={card.name}
                                                />
                                              )
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
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

              {/* Card Draw Probabilities Section */}
              <div className="statistics-section">
                <div
                  className="hand-header clickable"
                  onClick={() =>
                    setExpandedTables({
                      ...expandedTables,
                      theoreticalProb: !expandedTables.theoreticalProb,
                    })
                  }
                >
                  <h3>Card Draw Probabilities</h3>
                  <span className="toggle-indicator">
                    {expandedTables.theoreticalProb ? "▲" : "▼"}
                  </span>
                </div>

                {/* Always show the explanation even when collapsed */}
                <div className="probability-explanation">
                  <p>
                    The theoretical probability of drawing specific cards in the
                    opening hand is calculated using hypergeometric probability
                    distribution.
                  </p>
                </div>

                {expandedTables.theoreticalProb && (
                  <>
                    <div className="probability-formula">
                      <h4>Formula</h4>
                      <p>P(X = k) = [C(K,k) × C(N-K,n-k)] / C(N,n)</p>
                      <ul>
                        <li>N is the deck size</li>
                        <li>
                          K is the number of copies of the card in the deck
                        </li>
                        <li>n is the hand size</li>
                        <li>k is the number of copies you want to draw</li>
                        <li>
                          C(n,k) is the binomial coefficient (combinations
                          formula)
                        </li>
                      </ul>
                    </div>

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
                              .slice(
                                0,
                                expandedTables.showAllCards
                                  ? theoreticalProbabilities.length
                                  : 10
                              )
                              .map((item, index) => (
                                <tr key={`prob-${index}`}>
                                  <td>{item.card.name}</td>
                                  <td>
                                    <img
                                      src={getCardImageUrl(
                                        item.card.id,
                                        "small"
                                      )}
                                      alt={item.card.name}
                                      onClick={() => onCardSelect(item.card)}
                                      className="table-card-image"
                                    />
                                  </td>
                                  <td>{item.card.totalCopies}</td>
                                  <td>{item.probability.toFixed(4)}%</td>
                                  <td>{item.exactOneProb.toFixed(4)}%</td>
                                  <td>{item.atLeastTwoProb.toFixed(4)}%</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedTables((prev) => ({
                          ...prev,
                          showAllCards: !prev.showAllCards,
                        }))
                      }
                      className="show-all-cards-button"
                    >
                      {expandedTables.showAllCards ? "Show Less" : "Show All"}
                    </button>
                  </>
                )}
              </div>

              {theoreticalGroupProbability && (
                <div className="statistics-section">
                  <h3>Theoretical Group Probabilities</h3>
                  <div className="card-statistics-tables">
                    <div className="card-statistics-table">
                      <h4>Group Probabilities</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>Group</th>
                            <th>Relation</th>
                            <th>Copies Needed</th>
                            <th>Probability</th>
                            <th>Cards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {theoreticalGroupProbability.groups.map(
                            (group, index) => (
                              <tr key={`group-${index}`}>
                                <td>Group {group.groupId + 1}</td>
                                <td>{group.relation}</td>
                                <td>{group.copies}</td>
                                <td>{group.probability.toFixed(4)}%</td>
                                <td className="hand-cards-preview">
                                  {group.cards.map((card, cardIndex) => (
                                    <img
                                      key={`group-${index}-${cardIndex}`}
                                      src={getCardImageUrl(card.id, "small")}
                                      alt={card.name}
                                      onClick={() => onCardSelect(card)}
                                      className="table-card-image"
                                      title={card.name}
                                    />
                                  ))}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="overall-probability">
                      <h4>Overall Probability</h4>
                      <p>
                        Probability of drawing all groups successfully:{" "}
                        {theoreticalGroupProbability.overallProbability.toFixed(
                          4
                        )}
                        %
                      </p>
                      <p className="hand-size-info">
                        Calculation based on deck size: {deck.mainDeck.length}{" "}
                        cards, hand size: {handSize} cards
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* All Simulated Hands Section - Now at the end as per PDF export */}
              <div className="statistics-section all-simulated-hands-section">
                <div
                  className="hand-header clickable"
                  onClick={() =>
                    setExpandedTables({
                      ...expandedTables,
                      allHands: !expandedTables.allHands,
                    })
                  }
                >
                  <h3>
                    All Simulated Hands
                    <span className="toggle-indicator">
                      {expandedTables.allHands ? "▲" : "▼"}
                    </span>
                  </h3>
                </div>

                {/* Add explanation for All Simulated Hands section */}
                <div className="probability-explanation">
                  <p>
                    This section displays all the hands drawn during your simulation, allowing you to
                    examine each individual hand in detail and identify patterns across multiple draws.
                  </p>
                </div>

                {expandedTables.allHands && (
                  <div className="all-hands-container">
                    {results.map((result, index) => (
                      <div
                        key={`simulation-${index}`}
                        className="simulation-hand-container"
                      >
                        <h4 className="simulation-hand-title">
                          Simulation #{index + 1}
                        </h4>
                        <div className="hand-preview simulation-hand-preview">
                          {result.hand.map((card, cardIndex) => (
                            <img
                              key={`hand-${index}-card-${cardIndex}`}
                              src={getCardImageUrl(card.id, "small")}
                              alt={card.name}
                              onClick={() => onCardSelect(card)}
                              className="hand-card"
                              title={card.name}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DrawSimulator;
