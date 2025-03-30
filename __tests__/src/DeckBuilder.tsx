import { useState, useEffect } from "react";
import { DeckData } from "./scripts/ydk-parser";
import "./DeckBuilder.css";

type Card = {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  card_images: Array<{ image_url: string }>;
};

type Deck = {
  name: string;
  mainDeck: Card[];
  extraDeck: Card[];
};

type SearchFilters = {
  name: string;
  type: string;
  attribute: string;
  level: string;
  race: string;
  text: string;
};

export function DeckBuilder() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    type: "",
    attribute: "",
    level: "",
    race: "",
    text: "",
  });
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [deckAnalytics, setDeckAnalytics] = useState<any>(null);

  // Load available decks from localStorage
  useEffect(() => {
    const availableDecks: Deck[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("deck_")) {
        const deck = JSON.parse(localStorage.getItem(key) || "{}");
        availableDecks.push(deck);
      }
    }
    setDecks(availableDecks);
  }, []);

  // Select a deck to analyze
  const selectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    analyzeDeck(deck);
  };

  // Handle search filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setSearchFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Build search query parameters based on filters
  const buildSearchQuery = () => {
    const params = new URLSearchParams();

    if (searchFilters.name) {
      params.append("fname", searchFilters.name);
    }

    if (searchFilters.type) {
      params.append("type", searchFilters.type);
    }

    if (searchFilters.attribute) {
      params.append("attribute", searchFilters.attribute);
    }

    if (searchFilters.level) {
      params.append("level", searchFilters.level);
    }

    if (searchFilters.race) {
      params.append("race", searchFilters.race);
    }

    if (searchFilters.text) {
      params.append("desc", searchFilters.text);
    }

    return params.toString();
  };

  // Search card in external API
  const searchCard = async () => {
    // Ensure at least one filter is set
    if (Object.values(searchFilters).every((v) => !v)) {
      alert("Please enter at least one search term");
      return;
    }

    try {
      const queryParams = buildSearchQuery();
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?${queryParams}`
      );

      if (!response.ok) throw new Error("Failed to search cards");

      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching cards:", error);
      // Handle specific error for "no cards found"
      if (
        error instanceof Error &&
        error.message.includes("No card matching")
      ) {
        setSearchResults([]);
      }
    }
  };

  // Add card to deck
  const addCardToDeck = (card: Card) => {
    if (!selectedDeck) return;

    // Check if it's an Extra Deck card
    const isExtraDeck = ["XYZ", "Synchro", "Fusion", "Link"].some((type) =>
      card.type.includes(type)
    );

    const updatedDeck = { ...selectedDeck };

    if (isExtraDeck) {
      if (updatedDeck.extraDeck.length < 15) {
        updatedDeck.extraDeck = [...updatedDeck.extraDeck, card];
      } else {
        alert("Extra deck can't have more than 15 cards");
        return;
      }
    } else {
      if (updatedDeck.mainDeck.length < 60) {
        updatedDeck.mainDeck = [...updatedDeck.mainDeck, card];
      } else {
        alert("Main deck can't have more than 60 cards");
        return;
      }
    }

    setSelectedDeck(updatedDeck);
    // Save updated deck
    localStorage.setItem(
      `deck_${updatedDeck.name}`,
      JSON.stringify(updatedDeck)
    );
    // Re-analyze deck
    analyzeDeck(updatedDeck);
  };

  // Remove card from deck
  const removeCardFromDeck = (
    card: Card,
    index: number,
    isExtraDeck: boolean
  ) => {
    if (!selectedDeck) return;

    const updatedDeck = { ...selectedDeck };

    if (isExtraDeck) {
      updatedDeck.extraDeck = updatedDeck.extraDeck.filter(
        (_, idx) => idx !== index
      );
    } else {
      updatedDeck.mainDeck = updatedDeck.mainDeck.filter(
        (_, idx) => idx !== index
      );
    }

    setSelectedDeck(updatedDeck);
    // Save updated deck
    localStorage.setItem(
      `deck_${updatedDeck.name}`,
      JSON.stringify(updatedDeck)
    );
    // Re-analyze deck
    analyzeDeck(updatedDeck);
  };

  // Analyze deck and generate statistics
  const analyzeDeck = (deck: Deck) => {
    // Card type distribution
    const typeDistribution = deck.mainDeck.reduce((acc, card) => {
      const type = card.type.split(" ")[0]; // Simplify type
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Attribute distribution
    const attributeDistribution = deck.mainDeck.reduce((acc, card) => {
      if (card.attribute) {
        acc[card.attribute] = (acc[card.attribute] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Level/Rank distribution
    const levelDistribution = deck.mainDeck.reduce((acc, card) => {
      if (card.level) {
        acc[card.level] = (acc[card.level] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate opening hand probability
    // Simplified first-turn probability that you'll draw at least one copy of a specific card
    const calculateOpeningHandProbability = (copies: number) => {
      const deckSize = deck.mainDeck.length;
      const handSize = 5; // Standard opening hand

      if (deckSize < 5) return 0; // Edge case: deck too small

      // Probability of NOT drawing the card
      const notDrawingProb =
        (((((((((deckSize - copies) / deckSize) * (deckSize - copies - 1)) /
          (deckSize - 1)) *
          (deckSize - copies - 2)) /
          (deckSize - 2)) *
          (deckSize - copies - 3)) /
          (deckSize - 3)) *
          (deckSize - copies - 4)) /
        (deckSize - 4);

      // Probability of drawing at least one copy
      return (1 - notDrawingProb) * 100;
    };

    // Analyze consistency
    const cardCounts: Record<string, number> = {};
    deck.mainDeck.forEach((card) => {
      cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
    });

    const keyCards = Object.entries(cardCounts)
      .filter(([_, count]) => count >= 2) // Cards with at least 2 copies
      .map(([name, count]) => ({
        name,
        copies: count,
        openingProbability: calculateOpeningHandProbability(count),
      }))
      .sort((a, b) => b.openingProbability - a.openingProbability);

    // Deck consistency score (simplified)
    // Higher score = more consistent deck with optimal ratio
    const deckSize = deck.mainDeck.length;
    const consistencyScore = Math.max(0, 100 - Math.abs(deckSize - 40) * 2);

    // Analyze card archetype/series consistency
    const cardArchetypes = deck.mainDeck
      .map((card) => {
        // Extract likely archetypes from card names
        const nameParts = card.name.split(/[\s\-'"]/);
        return nameParts.filter((part) => part.length > 3);
      })
      .flat();

    const archetypeCounts: Record<string, number> = {};
    cardArchetypes.forEach((archetype) => {
      archetypeCounts[archetype] = (archetypeCounts[archetype] || 0) + 1;
    });

    // Find potential archetype focus (simple heuristic)
    const potentialArchetypes = Object.entries(archetypeCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    setDeckAnalytics({
      typeDistribution,
      attributeDistribution,
      levelDistribution,
      keyCards,
      deckSize,
      consistencyScore,
      extraDeckSize: deck.extraDeck.length,
      potentialArchetypes,
      monsterCount: Object.entries(typeDistribution)
        .filter(([type]) => !["Spell", "Trap"].includes(type))
        .reduce((sum, [_, count]) => sum + count, 0),
      spellCount: typeDistribution["Spell"] || 0,
      trapCount: typeDistribution["Trap"] || 0,
    });
  };

  return (
    <div className="deck-builder">
      <h1>Advanced Deck Builder</h1>

      <div className="builder-container">
        <div className="decks-panel">
          <h2>Your Decks</h2>
          <ul>
            {decks.map((deck) => (
              <li key={deck.name} onClick={() => selectDeck(deck)}>
                {deck.name} ({deck.mainDeck.length} main /{" "}
                {deck.extraDeck.length} extra)
              </li>
            ))}
          </ul>
        </div>

        <div className="editor-panel">
          <h2>Deck Editor</h2>
          {selectedDeck ? (
            <>
              <h3>{selectedDeck.name}</h3>

              <div className="search-controls">
                <div className="search-toggle">
                  <button
                    className={isAdvancedSearch ? "" : "active-search"}
                    onClick={() => setIsAdvancedSearch(false)}
                  >
                    Basic Search
                  </button>
                  <button
                    className={isAdvancedSearch ? "active-search" : ""}
                    onClick={() => setIsAdvancedSearch(true)}
                  >
                    Advanced Search
                  </button>
                </div>

                {isAdvancedSearch ? (
                  <div className="advanced-search">
                    <div className="search-row">
                      <label>
                        Card Name:
                        <input
                          type="text"
                          value={searchFilters.name}
                          onChange={(e) =>
                            handleFilterChange("name", e.target.value)
                          }
                          placeholder="Card name..."
                        />
                      </label>

                      <label>
                        Card Text:
                        <input
                          type="text"
                          value={searchFilters.text}
                          onChange={(e) =>
                            handleFilterChange("text", e.target.value)
                          }
                          placeholder="Card text..."
                        />
                      </label>
                    </div>

                    <div className="search-row">
                      <label>
                        Type:
                        <select
                          value={searchFilters.type}
                          onChange={(e) =>
                            handleFilterChange("type", e.target.value)
                          }
                        >
                          <option value="">Any Type</option>
                          <option value="Effect Monster">Effect Monster</option>
                          <option value="Normal Monster">Normal Monster</option>
                          <option value="Ritual Monster">Ritual Monster</option>
                          <option value="Fusion Monster">Fusion Monster</option>
                          <option value="Synchro Monster">
                            Synchro Monster
                          </option>
                          <option value="XYZ Monster">XYZ Monster</option>
                          <option value="Link Monster">Link Monster</option>
                          <option value="Spell Card">Spell Card</option>
                          <option value="Trap Card">Trap Card</option>
                        </select>
                      </label>

                      <label>
                        Attribute:
                        <select
                          value={searchFilters.attribute}
                          onChange={(e) =>
                            handleFilterChange("attribute", e.target.value)
                          }
                        >
                          <option value="">Any Attribute</option>
                          <option value="DARK">DARK</option>
                          <option value="LIGHT">LIGHT</option>
                          <option value="EARTH">EARTH</option>
                          <option value="WATER">WATER</option>
                          <option value="FIRE">FIRE</option>
                          <option value="WIND">WIND</option>
                          <option value="DIVINE">DIVINE</option>
                        </select>
                      </label>
                    </div>

                    <div className="search-row">
                      <label>
                        Level/Rank:
                        <select
                          value={searchFilters.level}
                          onChange={(e) =>
                            handleFilterChange("level", e.target.value)
                          }
                        >
                          <option value="">Any Level</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                            (level) => (
                              <option key={level} value={level.toString()}>
                                {level}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        Race:
                        <select
                          value={searchFilters.race}
                          onChange={(e) =>
                            handleFilterChange("race", e.target.value)
                          }
                        >
                          <option value="">Any Race</option>
                          <option value="Aqua">Aqua</option>
                          <option value="Beast">Beast</option>
                          <option value="Beast-Warrior">Beast-Warrior</option>
                          <option value="Dinosaur">Dinosaur</option>
                          <option value="Divine-Beast">Divine-Beast</option>
                          <option value="Dragon">Dragon</option>
                          <option value="Fairy">Fairy</option>
                          <option value="Fiend">Fiend</option>
                          <option value="Fish">Fish</option>
                          <option value="Insect">Insect</option>
                          <option value="Machine">Machine</option>
                          <option value="Plant">Plant</option>
                          <option value="Psychic">Psychic</option>
                          <option value="Pyro">Pyro</option>
                          <option value="Reptile">Reptile</option>
                          <option value="Rock">Rock</option>
                          <option value="Sea Serpent">Sea Serpent</option>
                          <option value="Spellcaster">Spellcaster</option>
                          <option value="Thunder">Thunder</option>
                          <option value="Warrior">Warrior</option>
                          <option value="Winged Beast">Winged Beast</option>
                          <option value="Zombie">Zombie</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="card-search">
                    <input
                      type="text"
                      value={searchFilters.name}
                      onChange={(e) =>
                        handleFilterChange("name", e.target.value)
                      }
                      placeholder="Search card name..."
                    />
                  </div>
                )}

                <button className="search-button" onClick={searchCard}>
                  Search
                </button>
              </div>

              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((card) => (
                    <div
                      key={card.id}
                      className="card-result"
                      onClick={() => addCardToDeck(card)}
                    >
                      <img
                        src={card.card_images[0].image_url}
                        alt={card.name}
                        width="60"
                      />
                      <div>
                        <div className="card-name">{card.name}</div>
                        <div className="card-type">{card.type}</div>
                        {card.attribute && (
                          <div className="card-attr">{card.attribute}</div>
                        )}
                        {card.level && (
                          <div className="card-level">Level: {card.level}</div>
                        )}
                        {card.atk !== undefined && (
                          <div className="card-stats">
                            ATK: {card.atk} / DEF: {card.def}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {searchFilters.name
                      ? "No cards found. Try adjusting your search."
                      : "Enter a search term to find cards."}
                  </div>
                )}
              </div>

              <div className="current-deck">
                <h4>Main Deck ({selectedDeck.mainDeck.length})</h4>
                <div className="card-grid">
                  {selectedDeck.mainDeck.map((card, idx) => (
                    <div
                      className="deck-card-container"
                      key={`${card.id}-${idx}`}
                    >
                      <img
                        src={card.card_images[0].image_url}
                        alt={card.name}
                        className="deck-card"
                        title={card.name}
                      />
                      <button
                        className="remove-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCardFromDeck(card, idx, false);
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <h4>Extra Deck ({selectedDeck.extraDeck.length})</h4>
                <div className="card-grid">
                  {selectedDeck.extraDeck.map((card, idx) => (
                    <div
                      className="deck-card-container"
                      key={`${card.id}-${idx}`}
                    >
                      <img
                        src={card.card_images[0].image_url}
                        alt={card.name}
                        className="deck-card"
                        title={card.name}
                      />
                      <button
                        className="remove-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCardFromDeck(card, idx, true);
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p>Select a deck to edit</p>
          )}
        </div>

        <div className="analytics-panel">
          <h2>Deck Analytics</h2>
          {deckAnalytics ? (
            <>
              <div className="analytics-section">
                <h3>
                  Consistency Score: {deckAnalytics.consistencyScore.toFixed(1)}
                  /100
                </h3>
                <div className="consistency-meter">
                  <div
                    className="consistency-fill"
                    style={{ width: `${deckAnalytics.consistencyScore}%` }}
                  />
                </div>
                {deckAnalytics.deckSize > 40 && (
                  <p className="advice">
                    ⚠️ Consider reducing deck size to 40 cards for maximum
                    consistency.
                  </p>
                )}
              </div>

              <div className="analytics-section">
                <h3>Card Composition</h3>
                <div className="ratio-chart">
                  <div className="ratio-bar">
                    <div
                      className="monster-ratio"
                      style={{
                        width: `${
                          (deckAnalytics.monsterCount /
                            deckAnalytics.deckSize) *
                          100
                        }%`,
                      }}
                      title={`Monsters: ${deckAnalytics.monsterCount} (${(
                        (deckAnalytics.monsterCount / deckAnalytics.deckSize) *
                        100
                      ).toFixed(1)}%)`}
                    />
                    <div
                      className="spell-ratio"
                      style={{
                        width: `${
                          (deckAnalytics.spellCount / deckAnalytics.deckSize) *
                          100
                        }%`,
                      }}
                      title={`Spells: ${deckAnalytics.spellCount} (${(
                        (deckAnalytics.spellCount / deckAnalytics.deckSize) *
                        100
                      ).toFixed(1)}%)`}
                    />
                    <div
                      className="trap-ratio"
                      style={{
                        width: `${
                          (deckAnalytics.trapCount / deckAnalytics.deckSize) *
                          100
                        }%`,
                      }}
                      title={`Traps: ${deckAnalytics.trapCount} (${(
                        (deckAnalytics.trapCount / deckAnalytics.deckSize) *
                        100
                      ).toFixed(1)}%)`}
                    />
                  </div>
                  <div className="ratio-legend">
                    <span className="monster-legend">Monsters</span>
                    <span className="spell-legend">Spells</span>
                    <span className="trap-legend">Traps</span>
                  </div>
                </div>
              </div>

              <div className="analytics-section">
                <h3>Card Type Distribution</h3>
                <ul className="distribution-list">
                  {Object.entries(deckAnalytics.typeDistribution).map(
                    ([type, count]) => (
                      <li key={type}>
                        <span>{type}:</span>
                        <span>
                          {count} cards (
                          {((count / deckAnalytics.deckSize) * 100).toFixed(1)}
                          %)
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="analytics-section">
                <h3>Key Card Probabilities</h3>
                <ul className="probability-list">
                  {deckAnalytics.keyCards.slice(0, 5).map((card) => (
                    <li key={card.name}>
                      <span>
                        {card.name} ({card.copies}x):
                      </span>
                      <span>
                        {card.openingProbability.toFixed(1)}% chance in opening
                        hand
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {deckAnalytics.potentialArchetypes.length > 0 && (
                <div className="analytics-section">
                  <h3>Potential Archetype Focus</h3>
                  <ul className="archetype-list">
                    {deckAnalytics.potentialArchetypes.map((archetype) => (
                      <li key={archetype.name}>
                        {archetype.name}: {archetype.count} cards
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="analytics-section">
                <h3>Deck Optimization Tips</h3>
                <ul className="advice-list">
                  {deckAnalytics.consistencyScore < 90 && (
                    <li>
                      Run closer to 40 cards to see your key cards more
                      consistently
                    </li>
                  )}
                  {!Object.keys(deckAnalytics.typeDistribution).includes(
                    "Spell"
                  ) ||
                    (deckAnalytics.typeDistribution["Spell"] < 10 && (
                      <li>
                        Consider adding more Spell cards to increase flexibility
                      </li>
                    ))}
                  {!Object.keys(deckAnalytics.typeDistribution).includes(
                    "Trap"
                  ) ||
                    (deckAnalytics.typeDistribution["Trap"] < 5 && (
                      <li>
                        Add defensive Trap cards to disrupt opponent plays
                      </li>
                    ))}
                  {deckAnalytics.extraDeckSize < 15 && (
                    <li>Fill your Extra Deck to maximize options</li>
                  )}
                  {deckAnalytics.monsterCount > 25 && (
                    <li>
                      Consider reducing monster count in favor of more spells
                    </li>
                  )}
                  {deckAnalytics.keyCards.length < 3 && (
                    <li>
                      Add more playsets (3 copies) of your best cards for
                      consistency
                    </li>
                  )}
                </ul>
              </div>
            </>
          ) : (
            <p>Select a deck to view analytics</p>
          )}
        </div>
      </div>
    </div>
  );
}
