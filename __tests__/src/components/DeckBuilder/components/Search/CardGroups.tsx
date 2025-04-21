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
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleCreateGroup = () => {
    const result = onCreateGroup(newGroupName, newGroupDesc);
    if (result) {
      setNewGroupName("");
      setNewGroupDesc("");
      setIsCreating(false);
    }
  };

  const handleUpdateGroup = (groupId: string) => {
    onUpdateGroup(groupId, { name: editName, description: editDesc });
    setEditingGroupId(null);
  };

  const startEditing = (group: CardGroup) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
    setEditDesc(group.description || "");
  };

  const handleDeleteGroup = (groupId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this card collection?"
    );
    if (confirmed) {
      onDeleteGroup(groupId);
    }
  };

  const handleRemoveCard = (groupId: string, cardId: number) => {
    onRemoveCardFromGroup(groupId, cardId);
  };

  return (
    <div className="card-groups-container">
      <div className="card-groups-header">
        <h3>Card Groups</h3>
        <button
          className="new-group-button"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {isCreating && (
        <div className="create-collection-form">
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
          />
          <div className="form-actions">
            <button onClick={() => setIsCreating(false)}>Cancel</button>
            <button
              className="create-button"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {cardGroups.length === 0 ? (
        <div className="no-collections">
          <p>You don't have any card groups yet.</p>
          <p>Create a group to organize your favorite cards.</p>
        </div>
      ) : (
        <>
          <div className="help-text">
            <p>
              <strong>How to add cards to groups:</strong>
            </p>
            <ol>
              <li>Switch to "Cards" tab in the upper toggle</li>
              <li>
                When viewing a card, click "Add to Group" button in the card
                modal
              </li>
              <li>Select an existing group or create a new one</li>
            </ol>
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
                {editingGroupId === group.id ? (
                  <div
                    className="edit-group-form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                    <div className="form-actions">
                      <button onClick={() => setEditingGroupId(null)}>
                        Cancel
                      </button>
                      <button
                        className="save-button"
                        onClick={() => handleUpdateGroup(group.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="group-header">
                      <h4>{group.name}</h4>
                      <div
                        className="group-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(group);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        >
                          Delete
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
                                  src={
                                    card.card_images[0]?.image_url_small || ""
                                  }
                                  alt={card.name}
                                  onClick={() => onCardSelect(card)}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/card-images/card-back.jpg";
                                  }}
                                />
                                <button
                                  className="remove-card-btn"
                                  onClick={() =>
                                    handleRemoveCard(group.id, card.id)
                                  }
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
