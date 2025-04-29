import React, { useState, useEffect } from "react";
import { Deck } from "../../types";
import "./styles.css";

interface DeckNotesProps {
  deck: Deck;
  updateDeck: (updatedDeck: Deck) => void;
}

const DeckNotes: React.FC<DeckNotesProps> = ({ deck, updateDeck }) => {
  const [notes, setNotes] = useState<string>(deck.notes || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update notes when deck changes
  useEffect(() => {
    setNotes(deck.notes || "");
  }, [deck.id]);

  // Auto-save notes after user stops typing
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (notes !== deck.notes) {
        saveDeckNotes();
      }
    }, 1000); // Save 1 second after user stops typing

    return () => clearTimeout(saveTimeout);
  }, [notes]);

  const saveDeckNotes = () => {
    setIsSaving(true);

    // Create updated deck with notes
    const updatedDeck: Deck = {
      ...deck,
      notes: notes,
      lastModified: new Date().toISOString(),
    };

    // Update the deck in storage
    updateDeck(updatedDeck);

    // Update UI state
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  return (
    <div className="deck-notes-container">
      <div className="deck-notes-header">
        <h3>Deck Notes</h3>
        <div className="save-status">
          {isSaving && <span className="saving-indicator">Saving...</span>}
          {lastSaved && !isSaving && (
            <span className="last-saved">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <textarea
        className="deck-notes-textarea"
        value={notes}
        onChange={handleNotesChange}
        placeholder="Add notes about your deck strategy, combos, tech choices, or any other information you want to remember..."
      />

      <div className="notes-help">
        <p>Use these notes to record information about your deck such as:</p>
        <ul>
          <li>Key combos and card interactions</li>
          <li>Strategies against specific matchups</li>
          <li>Cards you're considering adding or removing</li>
          <li>Reminders about rulings or special interactions</li>
        </ul>
      </div>
    </div>
  );
};

export default DeckNotes;
