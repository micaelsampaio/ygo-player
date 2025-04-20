import React, { useState } from "react";
import "./CardTextAnalyzer.css";
import { Card } from "../../components/DeckBuilder/types";
import SearchPanel from "../../components/DeckBuilder/components/Search/SearchPanel";

// Define the analysis response interface to match the API
interface CardAnalysis {
  activationConditions: string[];
  costs: string[];
  effects: string[];
  maintenanceConditions: string[];
  restrictions: string[];
  linkingWords: string[];
  isOncePerTurn: boolean;
  isHardOncePerTurn: boolean;
  isTriggerEffect: boolean;
  isQuickEffect: boolean;
  targets: boolean;
}

interface AnalysisResponse {
  card: {
    id: number;
    name: string;
    type: string;
    text: string;
  };
  analysis: CardAnalysis;
}

const CardTextAnalyzerComponent: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [analysis, setAnalysis] = useState<CardAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Clear the input fields and results
  const clearAll = () => {
    setSelectedCard(null);
    setAnalysis(null);
    setError(null);
  };

  // Handle card selection from the SearchPanel
  const handleCardSelect = async (card: Card) => {
    setSelectedCard(card);
    await analyzeCard(card);
  };

  // Add to favorites handler (required by SearchPanel)
  const handleToggleFavorite = (card: Card) => {
    // Access the existing favorite cards functionality
    const storedFavorites = localStorage.getItem("favoriteCards");
    let favorites: Card[] = storedFavorites ? JSON.parse(storedFavorites) : [];

    const index = favorites.findIndex((c) => c.id === card.id);
    if (index >= 0) {
      favorites = favorites.filter((c) => c.id !== card.id);
    } else {
      favorites.push(card);
    }

    localStorage.setItem("favoriteCards", JSON.stringify(favorites));
    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  // No-op for "add to deck" - required by SearchPanel but not implemented
  const handleAddToDeck = () => {
    // Empty function - no-op as we don't need to add to deck in this component
  };

  // Analyze the selected card
  const analyzeCard = async (card: Card) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      console.log("Analyzing card:", card.name, card.id);

      // Fixed API endpoint URL - using the correct endpoint with ID in URL path
      const analyzerUrl =
        import.meta.env.VITE_ANALYZER_API_URL || "http://localhost:3003";
      const response = await fetch(
        `${analyzerUrl}/card-text/analyze/${card.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();
      console.log("Analysis response:", data);

      if (data.error) {
        setError(data.error as string);
        return;
      }

      // Set the analysis data
      setAnalysis(data.analysis);

      // Debug output to see what's in the analysis object
      console.log("Parsed analysis data:", {
        activationConditions: data.analysis.activationConditions,
        costs: data.analysis.costs,
        effects: data.analysis.effects,
        restrictions: data.analysis.restrictions,
        maintenanceConditions: data.analysis.maintenanceConditions,
        hasActivation: data.analysis.activationConditions?.length > 0,
        hasCosts: data.analysis.costs?.length > 0,
        hasEffects: data.analysis.effects?.length > 0,
      });
    } catch (err) {
      console.error("Error analyzing card text:", err);
      setError("Failed to analyze card text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to check if a section has any content
  const hasSectionContent = (items: string[] | undefined): boolean => {
    return Array.isArray(items) && items.length > 0;
  };

  // Render a section if it has content
  const renderSection = (
    title: string,
    items: string[] | undefined,
    iconClass: string
  ) => {
    if (!hasSectionContent(items)) return null;

    return (
      <div className="psct-section">
        <h4>
          <span className={`section-icon ${iconClass}`}></span>
          {title}
        </h4>
        <ul>{items && items.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
      </div>
    );
  };

  return (
    <div className="card-text-analyzer">
      <h2>Yu-Gi-Oh! Card Text Analyzer</h2>
      <p className="description">
        Analyze card text to understand Problem-Solving Card Text (PSCT)
        structure and terminology.
      </p>

      <div className="analyzer-content">
        <div className="search-container">
          {selectedCard ? (
            <div className="selected-card-header">
              <h3>Selected Card</h3>
              <button onClick={clearAll} className="clear-button">
                Clear Selection
              </button>
            </div>
          ) : (
            <h3>Find a Card to Analyze</h3>
          )}

          {!selectedCard && (
            <div className="search-wrapper">
              <SearchPanel
                onCardSelect={handleCardSelect}
                onCardAdd={handleAddToDeck}
                onToggleFavorite={handleToggleFavorite}
                hideAddToDeck={true} // Hide "add to deck" functionality
              />
            </div>
          )}
        </div>

        {selectedCard && (
          <div className="selected-card">
            <div className="selected-card-content">
              <div className="selected-card-image">
                <img
                  src={`${import.meta.env.VITE_YGO_CDN_URL}/images/cards/${
                    selectedCard.id
                  }.jpg`}
                  alt={selectedCard.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${
                      import.meta.env.VITE_YGO_CDN_URL
                    }/images/cards/card_back.jpg`;
                  }}
                />
              </div>
              <div className="selected-card-info">
                <h3>{selectedCard.name}</h3>
                <p className="card-type-race">
                  {selectedCard.type}
                  {selectedCard.race ? ` • ${selectedCard.race}` : ""}
                  {selectedCard.attribute ? ` • ${selectedCard.attribute}` : ""}
                </p>
                <p className="card-text">{selectedCard.desc}</p>
                {selectedCard.atk !== undefined && (
                  <p className="card-stats">
                    ATK: {selectedCard.atk} / DEF: {selectedCard.def}
                  </p>
                )}
                {selectedCard.level !== undefined && (
                  <p className="card-level">Level: {selectedCard.level}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-message">Analyzing card text...</div>}

      {analysis && !loading && (
        <div className="analysis-results">
          <h3>PSCT Analysis</h3>

          <div className="sections-analysis">
            <h4>Text Structure</h4>
            {/* Debug output for troubleshooting */}
            {/* <pre>{JSON.stringify(analysis, null, 2)}</pre> */}

            {hasSectionContent(analysis.activationConditions) ||
            hasSectionContent(analysis.costs) ||
            hasSectionContent(analysis.effects) ||
            hasSectionContent(analysis.restrictions) ||
            hasSectionContent(analysis.maintenanceConditions) ? (
              <div className="psct-sections">
                {renderSection(
                  "Activation Conditions",
                  analysis.activationConditions,
                  "activation-icon"
                )}
                {renderSection("Costs", analysis.costs, "cost-icon")}
                {renderSection("Effects", analysis.effects, "effect-icon")}
                {renderSection(
                  "Restrictions",
                  analysis.restrictions,
                  "restriction-icon"
                )}
                {renderSection(
                  "Maintenance Conditions",
                  analysis.maintenanceConditions,
                  "maintenance-icon"
                )}
              </div>
            ) : (
              <p>No sections found in the card text analysis.</p>
            )}
          </div>

          {/* Properties Section */}
          <div className="card-properties">
            <h4>Card Properties</h4>
            <ul className="properties-list">
              {analysis.isQuickEffect && (
                <li className="property quick-effect">
                  <span className="property-icon">⚡</span>
                  <span className="property-text">Quick Effect</span>
                </li>
              )}
              {analysis.isTriggerEffect && (
                <li className="property trigger-effect">
                  <span className="property-icon">🔄</span>
                  <span className="property-text">Trigger Effect</span>
                </li>
              )}
              {analysis.isHardOncePerTurn && (
                <li className="property hard-opt">
                  <span className="property-icon">🔒</span>
                  <span className="property-text">Hard Once Per Turn</span>
                </li>
              )}
              {analysis.isOncePerTurn && !analysis.isHardOncePerTurn && (
                <li className="property soft-opt">
                  <span className="property-icon">🔓</span>
                  <span className="property-text">Soft Once Per Turn</span>
                </li>
              )}
              {analysis.targets && (
                <li className="property targets">
                  <span className="property-icon">🎯</span>
                  <span className="property-text">Targets</span>
                </li>
              )}
            </ul>
          </div>

          {/* PSCT Linking Words */}
          {analysis.linkingWords && analysis.linkingWords.length > 0 && (
            <div className="linking-words">
              <h4>PSCT Conjunctions</h4>
              <ul className="linking-words-list">
                {analysis.linkingWords.map((word, idx) => (
                  <li key={idx} className="linking-word">
                    <span className="word">{word}</span>
                    <span className="word-explanation">
                      {word === "and if you do" &&
                        "Both actions happen simultaneously"}
                      {word === "then" &&
                        "Second action happens after the first"}
                      {word === "also" &&
                        "Second action happens regardless of the first"}
                      {word === "after that" &&
                        "Second action happens after the first resolves"}
                      {word === "and" && "Both actions happen together"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardTextAnalyzerComponent;
