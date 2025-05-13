import React, { useState, useEffect } from "react";
import { Card, Deck, SidingPattern } from "../../types";
import { useSidePatterns } from "../../hooks/useSidePatterns";
import { getCardImageUrl } from "../../../../utils/cardImages";
import "./SidePatternsTool.css";

// Interface to track card counts
interface CardCount {
  card: Card;
  count: number;
}

interface SidePatternsToolProps {
  deck: Deck;
  onUpdateDeck: (deck: Deck) => void;
}

const SidePatternsTool: React.FC<SidePatternsToolProps> = ({
  deck,
  onUpdateDeck,
}) => {
  // States for the form
  const [patternName, setPatternName] = useState("");
  const [matchup, setMatchup] = useState("");
  const [description, setDescription] = useState("");
  const [cardsToRemove, setCardsToRemove] = useState<Card[]>([]);
  const [cardsToAdd, setCardsToAdd] = useState<Card[]>([]);
  // New state for card counts
  const [cardsToRemoveCount, setCardsToRemoveCount] = useState<CardCount[]>([]);
  const [cardsToAddCount, setCardsToAddCount] = useState<CardCount[]>([]);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showStatusMessage, setShowStatusMessage] = useState(false);

  // Hook for managing side patterns
  const {
    sidePatterns,
    selectedPattern,
    isLoading,
    createPattern,
    updatePattern,
    deletePattern,
    selectPattern,
    applySidePattern,
    setSelectedPattern,
  } = useSidePatterns(deck.id);

  // Reset selected pattern when deck changes
  useEffect(() => {
    if (sidePatterns.length > 0 && !selectedPattern) {
      setSelectedPattern(sidePatterns[0]);
    }
  }, [sidePatterns, selectedPattern, setSelectedPattern]);

  // Add a useEffect to monitor isFormVisible changes
  useEffect(() => {
    console.log("isFormVisible changed to:", isFormVisible);
  }, [isFormVisible]);

  // Reset form when selected pattern changes
  useEffect(() => {
    if (selectedPattern && formMode === "edit") {
      setPatternName(selectedPattern.name);
      setMatchup(selectedPattern.matchup);
      setDescription(selectedPattern.description || "");
      setCardsToRemove(selectedPattern.cardsToRemove || []);
      setCardsToAdd(selectedPattern.cardsToAdd || []);
    }
  }, [selectedPattern, formMode]);

  useEffect(() => {
    // Initialize card counts when form mode changes
    if (formMode === "create" || !selectedPattern) {
      // Process unique cards in main/extra deck for removal
      const mainExtraDeck = [...deck.mainDeck, ...(deck.extraDeck || [])];
      const uniqueCards = getUniqueCards(mainExtraDeck);
      setCardsToRemoveCount(uniqueCards.map((card) => ({ card, count: 0 })));

      // Process unique cards in side deck for adding
      const uniqueSideCards = getUniqueCards(deck.sideDeck || []);
      setCardsToAddCount(uniqueSideCards.map((card) => ({ card, count: 0 })));
    } else if (formMode === "edit" && selectedPattern) {
      // Convert existing cardsToRemove array to counts
      const removeCardCounts = convertToCardCounts(
        selectedPattern.cardsToRemove
      );

      // Add any cards from main/extra deck that aren't already in the count list
      const mainExtraDeck = [...deck.mainDeck, ...(deck.extraDeck || [])];
      const uniqueMainExtra = getUniqueCards(mainExtraDeck);

      const finalRemoveCounts = uniqueMainExtra.map((card) => {
        const existingCount = removeCardCounts.find(
          (c) => c.card.id === card.id
        );
        return existingCount || { card, count: 0 };
      });

      setCardsToRemoveCount(finalRemoveCounts);

      // Same for cardsToAdd
      const addCardCounts = convertToCardCounts(selectedPattern.cardsToAdd);

      const uniqueSideCards = getUniqueCards(deck.sideDeck || []);
      const finalAddCounts = uniqueSideCards.map((card) => {
        const existingCount = addCardCounts.find((c) => c.card.id === card.id);
        return existingCount || { card, count: 0 };
      });

      setCardsToAddCount(finalAddCounts);
    }
  }, [formMode, selectedPattern, deck]);

  // Utility function to get unique cards by ID
  const getUniqueCards = (cards: Card[]): Card[] => {
    const uniqueCardMap = new Map<number, Card>();
    cards.forEach((card) => {
      if (!uniqueCardMap.has(card.id)) {
        uniqueCardMap.set(card.id, card);
      }
    });
    return Array.from(uniqueCardMap.values());
  };

  // Utility function to count card occurrences
  const getCardCount = (cards: Card[], cardId: number): number => {
    return cards.filter((card) => card.id === cardId).length;
  };

  // Utility function to convert card arrays to card counts
  const convertToCardCounts = (cards: Card[]): CardCount[] => {
    const countMap = new Map<number, CardCount>();

    cards.forEach((card) => {
      if (countMap.has(card.id)) {
        const existingCount = countMap.get(card.id)!;
        countMap.set(card.id, {
          card: existingCount.card,
          count: existingCount.count + 1,
        });
      } else {
        countMap.set(card.id, { card, count: 1 });
      }
    });

    return Array.from(countMap.values());
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // New handlers for card count adjustments
  const handleIncreaseCardRemove = (card: Card) => {
    const deckCardCount = getCardCount(
      [...deck.mainDeck, ...(deck.extraDeck || [])],
      card.id
    );
    const currentCount =
      cardsToRemoveCount.find((c) => c.card.id === card.id)?.count || 0;

    // Don't allow removing more copies than exist in deck
    if (currentCount >= deckCardCount) return;

    // Update count state
    setCardsToRemoveCount((prev) =>
      prev.map((c) =>
        c.card.id === card.id ? { ...c, count: c.count + 1 } : c
      )
    );

    // Also update the original array for backward compatibility
    setCardsToRemove((prev) => [...prev, card]);
  };

  const handleDecreaseCardRemove = (card: Card) => {
    const currentCount =
      cardsToRemoveCount.find((c) => c.card.id === card.id)?.count || 0;
    if (currentCount <= 0) return;

    // Update count state
    setCardsToRemoveCount((prev) =>
      prev.map((c) =>
        c.card.id === card.id ? { ...c, count: c.count - 1 } : c
      )
    );

    // Also update the original array
    const cardIndex = cardsToRemove.findIndex((c) => c.id === card.id);
    if (cardIndex >= 0) {
      const newCardsToRemove = [...cardsToRemove];
      newCardsToRemove.splice(cardIndex, 1);
      setCardsToRemove(newCardsToRemove);
    }
  };

  const handleIncreaseCardAdd = (card: Card) => {
    const sideDeckCardCount = getCardCount(deck.sideDeck || [], card.id);
    const currentCount =
      cardsToAddCount.find((c) => c.card.id === card.id)?.count || 0;

    // Don't allow adding more copies than exist in side deck
    if (currentCount >= sideDeckCardCount) return;

    // Update count state
    setCardsToAddCount((prev) =>
      prev.map((c) =>
        c.card.id === card.id ? { ...c, count: c.count + 1 } : c
      )
    );

    // Also update the original array for backward compatibility
    setCardsToAdd((prev) => [...prev, card]);
  };

  const handleDecreaseCardAdd = (card: Card) => {
    const currentCount =
      cardsToAddCount.find((c) => c.card.id === card.id)?.count || 0;
    if (currentCount <= 0) return;

    // Update count state
    setCardsToAddCount((prev) =>
      prev.map((c) =>
        c.card.id === card.id ? { ...c, count: c.count - 1 } : c
      )
    );

    // Also update the original array
    const cardIndex = cardsToAdd.findIndex((c) => c.id === card.id);
    if (cardIndex >= 0) {
      const newCardsToAdd = [...cardsToAdd];
      newCardsToAdd.splice(cardIndex, 1);
      setCardsToAdd(newCardsToAdd);
    }
  };

  const handleCreatePattern = () => {
    console.log("Create New Pattern button clicked");
    setFormMode("create");
    setPatternName("");
    setMatchup("");
    setDescription("");
    setCardsToRemove([]);
    setCardsToAdd([]);
    setIsFormVisible(true);
    console.log("isFormVisible set to", true);
  };

  const handleEditPattern = () => {
    if (!selectedPattern) return;
    setFormMode("edit");
    setIsFormVisible(true);
  };

  const handleSavePattern = () => {
    if (!patternName || !matchup) {
      showStatus("Please fill in all required fields.", "error");
      return;
    }

    if (cardsToRemove.length !== cardsToAdd.length) {
      showStatus(
        "The number of cards to side out must match the number of cards to side in.",
        "error"
      );
      return;
    }

    const pattern: SidingPattern = {
      id:
        formMode === "edit" && selectedPattern
          ? selectedPattern.id
          : `pattern-${Date.now()}`,
      name: patternName,
      matchup,
      description,
      cardsToRemove,
      cardsToAdd,
      createdAt:
        formMode === "edit" && selectedPattern
          ? selectedPattern.createdAt
          : Date.now(),
      updatedAt: Date.now(),
    };

    if (formMode === "create") {
      createPattern(pattern);
      setSelectedPattern(pattern);
      showStatus("Side pattern created successfully!", "success");
    } else {
      updatePattern(pattern);
      showStatus("Side pattern updated successfully!", "success");
    }

    setIsFormVisible(false);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
  };

  const handleDeletePattern = () => {
    if (!selectedPattern) return;

    if (
      window.confirm(
        `Are you sure you want to delete the side pattern "${selectedPattern.name}"?`
      )
    ) {
      deletePattern(selectedPattern.id);
      showStatus("Side pattern deleted successfully!", "success");
    }
  };

  const handleApplyPattern = () => {
    if (!selectedPattern) return;

    try {
      // Get updated deck after applying the side pattern
      const result = applySidePattern(
        selectedPattern,
        deck.mainDeck,
        deck.extraDeck || [],
        deck.sideDeck || []
      );

      // Create updated deck object, preserving the sidePatterns property
      const updatedDeck = {
        ...deck,
        mainDeck: result.mainDeck,
        extraDeck: result.extraDeck,
        sideDeck: result.sideDeck,
        // Ensure side patterns are preserved
        sidePatterns: sidePatterns,
      };

      // Update the deck in the parent component
      onUpdateDeck(updatedDeck);
      showStatus("Side pattern applied successfully!", "success");
    } catch (err) {
      showStatus(
        "Error applying side pattern: " +
          (err instanceof Error ? err.message : "Unknown error"),
        "error"
      );
    }
  };

  const handleToggleCardRemove = (card: Card) => {
    const isSelected = cardsToRemove.some((c) => c.id === card.id);
    if (isSelected) {
      setCardsToRemove(cardsToRemove.filter((c) => c.id !== card.id));
    } else {
      setCardsToRemove([...cardsToRemove, card]);
    }
  };

  const handleToggleCardAdd = (card: Card) => {
    const isSelected = cardsToAdd.some((c) => c.id === card.id);
    if (isSelected) {
      setCardsToAdd(cardsToAdd.filter((c) => c.id !== card.id));
    } else {
      setCardsToAdd([...cardsToAdd, card]);
    }
  };

  const showStatus = (message: string, type: "success" | "error") => {
    setStatusMessage(message);
    setShowStatusMessage(true);

    // Add success or error class based on the message type
    const statusElement = document.getElementById("status-message");
    if (statusElement) {
      statusElement.className = `status-message ${type}`;
    }

    setTimeout(() => {
      setShowStatusMessage(false);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="side-patterns-loading">
        <div className="loading-spinner"></div>
        Loading side patterns...
      </div>
    );
  }

  return (
    <div className="side-patterns-tool">
      {showStatusMessage && (
        <div id="status-message" className="status-message">
          {statusMessage}
        </div>
      )}

      <div className="side-patterns-header">
        <h2>Side Deck Patterns</h2>
        <p className="side-patterns-description">
          Create and manage side patterns to quickly swap cards for different
          matchups. Each pattern lets you define which cards to remove from your
          main/extra deck and which cards to add from your side deck.
        </p>
      </div>

      <div className="side-patterns-container">
        <div className="patterns-sidebar">
          <div className="patterns-actions">
            <button
              className="pattern-button create-button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(
                  "Create New Pattern button clicked with explicit event handling"
                );
                handleCreatePattern();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCreatePattern();
                }
              }}
              type="button"
            >
              Create New Pattern
            </button>
          </div>

          {sidePatterns.length > 0 ? (
            <div className="patterns-list">
              {sidePatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={`pattern-item ${
                    selectedPattern?.id === pattern.id ? "selected" : ""
                  }`}
                  onClick={() => selectPattern(pattern.id)}
                >
                  <div className="pattern-name">{pattern.name}</div>
                  <div className="pattern-matchup">vs. {pattern.matchup}</div>
                  <div className="pattern-cards-count">
                    {pattern.cardsIn
                      ? pattern.cardsIn.reduce(
                          (total, card) => total + (card.count || 0),
                          0
                        )
                      : pattern.cardsToAdd
                      ? pattern.cardsToAdd.length
                      : 0}{" "}
                    cards ↔{" "}
                    {pattern.cardsOut
                      ? pattern.cardsOut.reduce(
                          (total, card) => total + (card.count || 0),
                          0
                        )
                      : pattern.cardsToRemove
                      ? pattern.cardsToRemove.length
                      : 0}{" "}
                    cards
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-patterns">
              <p>No side patterns created yet.</p>
              <p>Click "Create New Pattern" to get started.</p>
            </div>
          )}
        </div>

        <div className="pattern-details-container">
          {isFormVisible ? (
            <div className="pattern-form">
              <h3>
                {formMode === "create" ? "Create New Pattern" : "Edit Pattern"}
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="patternName">Pattern Name</label>
                  <input
                    id="patternName"
                    type="text"
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    placeholder="e.g., Anti-Branded"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="matchup">Matchup</label>
                  <input
                    id="matchup"
                    type="text"
                    value={matchup}
                    onChange={(e) => setMatchup(e.target.value)}
                    placeholder="e.g., Branded Despia"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this side pattern and why these cards are effective..."
                  rows={3}
                />
              </div>

              <div className="cards-selection">
                <div className="selection-container">
                  <h4>Select Cards to Side Out ({cardsToRemove.length})</h4>
                  <p className="selection-hint">
                    Click + or - to adjust the number of copies
                  </p>
                  <div className="cards-grid">
                    {cardsToRemoveCount.map((cardCount) => {
                      // Count how many copies of this card exist in the deck
                      const maxCount = getCardCount(
                        [...deck.mainDeck, ...(deck.extraDeck || [])],
                        cardCount.card.id
                      );

                      return (
                        <div
                          key={`remove-${cardCount.card.id}`}
                          className={`card-item ${
                            cardCount.count > 0 ? "selected" : ""
                          }`}
                        >
                          <img
                            src={
                              cardCount.card.card_images?.[0]
                                ?.image_url_small ||
                              getCardImageUrl(cardCount.card.id, "small")
                            }
                            alt={cardCount.card.name}
                            title={cardCount.card.name}
                          />

                          <div className="card-counter">
                            <button
                              className="counter-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecreaseCardRemove(cardCount.card);
                              }}
                              disabled={cardCount.count <= 0}
                            >
                              -
                            </button>
                            <span className="counter-value">
                              {cardCount.count}/{maxCount}
                            </span>
                            <button
                              className="counter-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIncreaseCardRemove(cardCount.card);
                              }}
                              disabled={cardCount.count >= maxCount}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="selection-container">
                  <h4>Select Cards to Side In ({cardsToAdd.length})</h4>
                  <p className="selection-hint">
                    Click + or - to adjust the number of copies
                  </p>
                  <div className="cards-grid">
                    {cardsToAddCount.map((cardCount) => {
                      // Count how many copies of this card exist in the side deck
                      const maxCount = getCardCount(
                        deck.sideDeck || [],
                        cardCount.card.id
                      );

                      return (
                        <div
                          key={`add-${cardCount.card.id}`}
                          className={`card-item ${
                            cardCount.count > 0 ? "selected" : ""
                          }`}
                        >
                          <img
                            src={
                              cardCount.card.card_images?.[0]
                                ?.image_url_small ||
                              getCardImageUrl(cardCount.card.id, "small")
                            }
                            alt={cardCount.card.name}
                            title={cardCount.card.name}
                          />

                          <div className="card-counter">
                            <button
                              className="counter-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecreaseCardAdd(cardCount.card);
                              }}
                              disabled={cardCount.count <= 0}
                            >
                              -
                            </button>
                            <span className="counter-value">
                              {cardCount.count}/{maxCount}
                            </span>
                            <button
                              className="counter-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIncreaseCardAdd(cardCount.card);
                              }}
                              disabled={cardCount.count >= maxCount}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="form-footer">
                {cardsToAdd.length !== cardsToRemove.length && (
                  <div className="form-warning">
                    Warning: The number of cards to side out (
                    {cardsToRemove.length}) must match the number of cards to
                    side in ({cardsToAdd.length})
                  </div>
                )}

                <div className="form-actions">
                  <button className="cancel-button" onClick={handleCancelForm}>
                    Cancel
                  </button>
                  <button
                    className="save-button"
                    onClick={handleSavePattern}
                    disabled={
                      !patternName ||
                      !matchup ||
                      cardsToAdd.length !== cardsToRemove.length
                    }
                  >
                    Save Pattern
                  </button>
                </div>
              </div>
            </div>
          ) : selectedPattern ? (
            <div className="pattern-details">
              <div className="pattern-header">
                <h3>{selectedPattern.name}</h3>
                <div className="matchup-label">
                  vs. {selectedPattern.matchup}
                </div>
              </div>

              {selectedPattern.description && (
                <div className="pattern-description">
                  <p>{selectedPattern.description}</p>
                </div>
              )}

              <div className="pattern-info">
                <div className="info-row">
                  <div className="info-label">Created:</div>
                  <div>{formatDate(selectedPattern.createdAt)}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">Last updated:</div>
                  <div>{formatDate(selectedPattern.updatedAt)}</div>
                </div>
                <div className="info-row">
                  <div className="info-label">Cards swapped:</div>
                  <div>
                    {selectedPattern.cardsIn
                      ? selectedPattern.cardsIn.reduce(
                          (total, card) => total + (card.count || 0),
                          0
                        )
                      : selectedPattern.cardsToAdd
                      ? selectedPattern.cardsToAdd.length
                      : 0}
                  </div>
                </div>
              </div>

              <div className="pattern-cards">
                <div className="pattern-cards-section">
                  <h4>
                    Side Out (
                    {selectedPattern.cardsOut
                      ? selectedPattern.cardsOut.reduce(
                          (total, card) => total + (card.count || 0),
                          0
                        )
                      : selectedPattern.cardsToRemove
                      ? selectedPattern.cardsToRemove.length
                      : 0}
                    )
                  </h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsOut ? (
                      // New format with counts
                      selectedPattern.cardsOut.map((card) => (
                        <div
                          key={`remove-detail-${card.id}`}
                          className="card-item"
                        >
                          <img
                            src={getCardImageUrl(card.id, "small")}
                            alt={card.name}
                            title={card.name}
                          />
                          {card.count > 1 && (
                            <div className="card-count-badge">
                              {card.count}x
                            </div>
                          )}
                        </div>
                      ))
                    ) : selectedPattern.cardsToRemove ? (
                      // Old format
                      selectedPattern.cardsToRemove.map((card, index) => (
                        <div
                          key={`remove-detail-${card.id}-${index}`}
                          className="card-item"
                        >
                          <img
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              getCardImageUrl(card.id, "small")
                            }
                            alt={card.name}
                            title={card.name}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="no-cards">No cards to side out</div>
                    )}
                  </div>
                </div>

                <div className="pattern-cards-section">
                  <h4>
                    Side In (
                    {selectedPattern.cardsIn
                      ? selectedPattern.cardsIn.reduce(
                          (total, card) => total + (card.count || 0),
                          0
                        )
                      : selectedPattern.cardsToAdd
                      ? selectedPattern.cardsToAdd.length
                      : 0}
                    )
                  </h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsIn ? (
                      // New format with counts
                      selectedPattern.cardsIn.map((card) => (
                        <div
                          key={`add-detail-${card.id}`}
                          className="card-item"
                        >
                          <img
                            src={getCardImageUrl(card.id, "small")}
                            alt={card.name}
                            title={card.name}
                          />
                          {card.count > 1 && (
                            <div className="card-count-badge">
                              {card.count}x
                            </div>
                          )}
                        </div>
                      ))
                    ) : selectedPattern.cardsToAdd ? (
                      // Old format
                      selectedPattern.cardsToAdd.map((card, index) => (
                        <div
                          key={`add-detail-${card.id}-${index}`}
                          className="card-item"
                        >
                          <img
                            src={
                              card.card_images?.[0]?.image_url_small ||
                              getCardImageUrl(card.id, "small")
                            }
                            alt={card.name}
                            title={card.name}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="no-cards">No cards to side in</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pattern-actions">
                <button className="edit-button" onClick={handleEditPattern}>
                  Edit Pattern
                </button>
                <button className="delete-button" onClick={handleDeletePattern}>
                  Delete Pattern
                </button>
                <button className="apply-button" onClick={handleApplyPattern}>
                  Apply This Pattern
                </button>
              </div>
            </div>
          ) : (
            <div className="no-pattern-selected">
              <p>Select a side pattern from the list or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidePatternsTool;
