import React from "react";

interface DeckStyleProps {
  powerUtility: {
    deckStyle: string;
    explanation: string;
    monsterRatio: number;
    spellRatio: number;
    trapRatio: number;
  };
}

const DeckStyle: React.FC<DeckStyleProps> = ({ powerUtility }) => {
  return (
    <div className="analytics-section">
      <h3>Deck Style</h3>
      <div className="deck-style-analysis">
        <div className="deck-style-header">
          This appears to be a <strong>{powerUtility.deckStyle}</strong> deck.
        </div>
        <p>{powerUtility.explanation}</p>

        <div className="deck-ratio-visualization">
          <div className="ratio-bars">
            <div className="ratio-bar-container">
              <div className="ratio-label">Monsters</div>
              <div className="ratio-bar-wrapper">
                <div
                  className="ratio-bar monster-ratio"
                  style={{
                    width: `${powerUtility.monsterRatio * 100}%`,
                  }}
                />
              </div>
              <div className="ratio-value">
                {(powerUtility.monsterRatio * 100).toFixed(0)}%
              </div>
            </div>

            <div className="ratio-bar-container">
              <div className="ratio-label">Spells</div>
              <div className="ratio-bar-wrapper">
                <div
                  className="ratio-bar spell-ratio"
                  style={{
                    width: `${powerUtility.spellRatio * 100}%`,
                  }}
                />
              </div>
              <div className="ratio-value">
                {(powerUtility.spellRatio * 100).toFixed(0)}%
              </div>
            </div>

            <div className="ratio-bar-container">
              <div className="ratio-label">Traps</div>
              <div className="ratio-bar-wrapper">
                <div
                  className="ratio-bar trap-ratio"
                  style={{
                    width: `${powerUtility.trapRatio * 100}%`,
                  }}
                />
              </div>
              <div className="ratio-value">
                {(powerUtility.trapRatio * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckStyle;
