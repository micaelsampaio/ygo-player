import React, { useState, useEffect } from "react";
import { Card, Deck, SidingPattern, CardWithCount } from "../../types";
import { useSidePatterns } from "../../hooks/useSidePatterns";
import { getCardImageUrl } from "../../../../utils/cardImages";
import "./ViewSidePatterns.css";

interface ViewSidePatternsProps {
  deck: Deck;
}

const ViewSidePatterns: React.FC<ViewSidePatternsProps> = ({ deck }) => {
  const {
    sidePatterns,
    selectedPattern,
    isLoading,
    selectPattern,
    setSelectedPattern,
  } = useSidePatterns(deck.id);

  // Reset selected pattern when deck changes
  useEffect(() => {
    if (sidePatterns.length > 0 && !selectedPattern) {
      setSelectedPattern(sidePatterns[0]);
    }
  }, [sidePatterns, selectedPattern, setSelectedPattern]);

  if (isLoading) {
    return (
      <div className="view-side-patterns-loading">
        <div className="loading-spinner"></div>
        Loading side patterns...
      </div>
    );
  }

  // Helper function to get total card count
  const getTotalCardCount = (
    cards: CardWithCount[] | Card[] | undefined
  ): number => {
    if (!cards || cards.length === 0) return 0;

    // Check if it's the new format with counts
    if ("count" in cards[0]) {
      return (cards as CardWithCount[]).reduce(
        (sum, card) => sum + card.count,
        0
      );
    }

    // Old format, just count the array length
    return cards.length;
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="view-side-patterns">
      {sidePatterns.length === 0 ? (
        <div className="no-patterns-message">
          <h3>No Side Patterns Found</h3>
          <p>
            This deck doesn't have any side patterns defined. Side patterns help
            you quickly swap cards for different matchups.
          </p>
          <p>
            You can create side patterns in the Deck Builder by clicking the
            "Edit" button above.
          </p>
        </div>
      ) : (
        <div className="view-side-patterns-container">
          <div className="patterns-list">
            <h3>Side Patterns</h3>
            <div className="patterns-scroll">
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
                    {getTotalCardCount(pattern.cardsIn || pattern.cardsToAdd)}{" "}
                    cards
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPattern && (
            <div className="pattern-details">
              <div className="pattern-header">
                <h3>{selectedPattern.name}</h3>
                <div className="matchup-label">
                  vs. {selectedPattern.matchup}
                </div>
              </div>

              <div className="pattern-meta">
                <div className="pattern-created">
                  <span>Created:</span> {formatDate(selectedPattern.createdAt)}
                </div>
                <div className="pattern-updated">
                  <span>Updated:</span> {formatDate(selectedPattern.updatedAt)}
                </div>
              </div>

              {selectedPattern.description && (
                <div className="pattern-description">
                  <p>{selectedPattern.description}</p>
                </div>
              )}

              <div className="side-cards-container">
                <div className="side-cards-section">
                  <h4
                    data-count={getTotalCardCount(
                      selectedPattern.cardsOut || selectedPattern.cardsToRemove
                    )}
                  >
                    Side Out
                  </h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsOut &&
                    selectedPattern.cardsOut.length > 0 ? (
                      selectedPattern.cardsOut.map((card) => (
                        <div key={`remove-${card.id}`} className="card-item">
                          <img
                            src={getCardImageUrl(card.id)}
                            alt={card.name}
                            title={card.name}
                            loading="lazy"
                          />
                          {card.count > 1 && (
                            <div className="card-count-badge">
                              {card.count}x
                            </div>
                          )}
                        </div>
                      ))
                    ) : selectedPattern.cardsToRemove &&
                      selectedPattern.cardsToRemove.length > 0 ? (
                      // Legacy support for old format
                      Array.from(
                        new Set(
                          selectedPattern.cardsToRemove.map((card) => card.id)
                        )
                      ).map((cardId) => {
                        const card = selectedPattern.cardsToRemove!.find(
                          (c) => c.id === cardId
                        );
                        const count = selectedPattern.cardsToRemove!.filter(
                          (c) => c.id === cardId
                        ).length;
                        return (
                          <div key={`remove-${cardId}`} className="card-item">
                            <img
                              src={getCardImageUrl(cardId)}
                              alt={card?.name || `Card #${cardId}`}
                              title={card?.name || `Card #${cardId}`}
                              loading="lazy"
                            />
                            {count > 1 && (
                              <div className="card-count-badge">{count}x</div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-cards">No cards to side out</p>
                    )}
                  </div>
                </div>

                <div className="side-cards-section">
                  <h4
                    data-count={getTotalCardCount(
                      selectedPattern.cardsIn || selectedPattern.cardsToAdd
                    )}
                  >
                    Side In
                  </h4>
                  <div className="cards-grid">
                    {selectedPattern.cardsIn &&
                    selectedPattern.cardsIn.length > 0 ? (
                      selectedPattern.cardsIn.map((card) => (
                        <div key={`add-${card.id}`} className="card-item">
                          <img
                            src={getCardImageUrl(card.id)}
                            alt={card.name}
                            title={card.name}
                            loading="lazy"
                          />
                          {card.count > 1 && (
                            <div className="card-count-badge">
                              {card.count}x
                            </div>
                          )}
                        </div>
                      ))
                    ) : selectedPattern.cardsToAdd &&
                      selectedPattern.cardsToAdd.length > 0 ? (
                      // Legacy support for old format
                      Array.from(
                        new Set(
                          selectedPattern.cardsToAdd.map((card) => card.id)
                        )
                      ).map((cardId) => {
                        const card = selectedPattern.cardsToAdd!.find(
                          (c) => c.id === cardId
                        );
                        const count = selectedPattern.cardsToAdd!.filter(
                          (c) => c.id === cardId
                        ).length;
                        return (
                          <div key={`add-${cardId}`} className="card-item">
                            <img
                              src={getCardImageUrl(cardId)}
                              alt={card?.name || `Card #${cardId}`}
                              title={card?.name || `Card #${cardId}`}
                              loading="lazy"
                            />
                            {count > 1 && (
                              <div className="card-count-badge">{count}x</div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-cards">No cards to side in</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewSidePatterns;
