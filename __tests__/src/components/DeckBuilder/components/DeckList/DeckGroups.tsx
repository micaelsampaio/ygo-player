import React, { useState } from "react";
import { DeckGroup, Deck } from "../../types";
import "./DeckGroups.css";

// SVG Folder icon component
const FolderIcon = ({ selected }: { selected: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

interface DeckGroupsProps {
  deckGroups: DeckGroup[];
  selectedGroup: DeckGroup | null;
  onSelectGroup: (group: DeckGroup) => void;
  onCreateGroup: (name: string, description?: string) => DeckGroup | null;
  onUpdateGroup: (groupId: string, updates: Partial<DeckGroup>) => void;
  onDeleteGroup: (groupId: string) => boolean;
  groupStats: Record<string, { count: number; decks: Deck[] }>;
}

const DeckGroups: React.FC<DeckGroupsProps> = ({
  deckGroups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  groupStats,
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

  const handleDeleteGroup = (groupId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this group?"
    );
    if (confirmed) {
      const result = onDeleteGroup(groupId);
      if (result && selectedGroup?.id === groupId) {
        // Select default group if the currently selected group is deleted
        const defaultGroup = deckGroups.find((g) => g.id === "default");
        if (defaultGroup) {
          onSelectGroup(defaultGroup);
        }
      }
    }
  };

  const startEditing = (group: DeckGroup) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
    setEditDesc(group.description || "");
  };

  return (
    <div className="deck-groups-container">
      <div className="deck-groups-header">
        <h3>Deck Folders</h3>
        <button
          className="new-group-button"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "Cancel" : "+ New Folder"}
        </button>
      </div>

      {isCreating && (
        <div className="create-group-form">
          <input
            type="text"
            placeholder="Folder Name"
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

      <ul className="deck-groups-list">
        {deckGroups.map((group) => (
          <li
            key={group.id}
            className={`deck-group-item ${
              selectedGroup?.id === group.id ? "selected" : ""
            }`}
            onClick={() => onSelectGroup(group)}
          >
            {editingGroupId === group.id ? (
              <div className="edit-group-form">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="form-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroupId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="save-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateGroup(group.id);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="group-info">
                  <span className="group-icon">
                    <FolderIcon selected={selectedGroup?.id === group.id} />
                  </span>
                  <div className="group-details">
                    <div className="group-name-container">
                      <span className="group-name">{group.name}</span>
                      <span className="deck-count">
                        {groupStats[group.id]?.count || 0}
                      </span>
                    </div>
                    {group.description && (
                      <span className="group-description">
                        {group.description}
                      </span>
                    )}
                  </div>
                </div>

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
                    disabled={group.id === "default"}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    disabled={group.id === "default"}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeckGroups;
