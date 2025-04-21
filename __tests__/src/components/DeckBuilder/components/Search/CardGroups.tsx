import React, { useState } from "react";
import { CardGroup, Card } from "../../types";
import "./CardGroups.css";

interface CardGroupsProps {
  cardGroups: CardGroup[];
  selectedGroup: CardGroup | null;
  onSelectGroup: (group: CardGroup) => void;
  onCreateGroup: (name: string, description?: string) => CardGroup | null;
  onUpdateGroup: (groupId: string, updates: Partial<CardGroup>) => void;
  onDeleteGroup: (groupId: string) => boolean;
  onAddCardToGroup: (groupId: string, card: Card) => boolean;
  onRemoveCardFromGroup: (groupId: string, cardId: number) => boolean;
  onCardSelect: (card: Card) => void;
  onAddCardToDeck: (card: Card) => void; // Prop to add a single card to the deck
  onAddAllCardsFromGroup?: (cards: Card[]) => void; // Prop to add all cards from a group to the deck
}

const CardGroups: React.FC<CardGroupsProps> = ({
  cardGroups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddCardToGroup,
  onRemoveCardFromGroup,
  onCardSelect,
  onAddCardToDeck,
  onAddAllCardsFromGroup,
}) => {
  const handleRemoveCard = (groupId: string, cardId: number) => {
    onRemoveCardFromGroup(groupId, cardId);
  };

  // New function to add all cards from a group to the deck
  const handleAddAllToDeck = (e: React.MouseEvent, cards: Card[]) => {
    e.stopPropagation();
    if (cards.length === 0) return;

    if (window.confirm(`Add all ${cards.length} cards to your deck?`)) {
      if (onAddAllCardsFromGroup) {
        // Use the dedicated function if available
        onAddAllCardsFromGroup(cards);
      } else {
        // Fallback to adding cards one by one
        cards.forEach((card) => {
          onAddCardToDeck(card);
        });
      }
    }
  };

  return (
    <div className="card-groups-container">
      <div className="card-groups-header">
        <h3>Card Groups</h3>
      </div>

      {cardGroups.length === 0 ? (
        <div className="no-collections">
          <p>You don't have any card groups yet.</p>
          <p>Manage your groups in /my/cards/groups</p>
        </div>
      ) : (
        <>
          <div className="help-text">
            <p>
              <strong>Card Groups:</strong> Select a group to view its cards or
              add them all to your deck.
            </p>
          </div>
          <div className="card-group-list">
            {cardGroups.map((group) => (
              <div
                key={group.id}
                className={`card-group-item ${
                  selectedGroup?.id === group.id ? "selected" : ""
                }`}
                onClick={() => onSelectGroup(group)}
              >
                <div className="group-header">
                  <h4>{group.name}</h4>
                  <div
                    className="group-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="add-all-button"
                      onClick={(e) => handleAddAllToDeck(e, group.cards)}
                      disabled={group.cards.length === 0}
                      title="Add all cards in this group to your deck"
                    >
                      Add All to Deck
                    </button>
                  </div>
                </div>

                {group.description && (
                  <p className="group-description">{group.description}</p>
                )}

                <div className="card-count">{group.cards.length} cards</div>

                {selectedGroup?.id === group.id && (
                  <div
                    className="collection-cards"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.cards.length === 0 ? (
                      <p className="empty-collection">
                        No cards in this group yet.
                      </p>
                    ) : (
                      <div className="cards-grid">
                        {group.cards.map((card) => (
                          <div key={card.id} className="collection-card">
                            <img
                              src={card.card_images[0]?.image_url_small || ""}
                              alt={card.name}
                              onClick={() => onCardSelect(card)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/card-images/card-back.jpg";
                              }}
                            />
                            <div className="card-action-buttons">
                              <button
                                className="add-card-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddCardToDeck(card);
                                }}
                                title="Add to deck"
                              >
                                +
                              </button>
                              <button
                                className="remove-card-btn"
                                onClick={() =>
                                  handleRemoveCard(group.id, card.id)
                                }
                                title="Remove from group"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CardGroups;
