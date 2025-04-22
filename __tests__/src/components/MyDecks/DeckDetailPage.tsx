import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { YGODeckToImage } from "ygo-core-images-utils";
import "../../styles/design-system.css";
import "./DeckDetailPage.css";

const DeckDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId } = useParams();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    // Load the deck data
    if (deckId) {
      try {
        const storedDeck = localStorage.getItem(`deck_${deckId}`);
        if (storedDeck) {
          setDeck(JSON.parse(storedDeck));
          setFileName(deckId.replace(/\s+/g, "_").toLowerCase());
        }
      } catch (error) {
        console.error("Error loading deck:", error);
      }
      setLoading(false);
    }
  }, [deckId]);

  const downloadDeckAsYdk = async () => {
    if (!deck || !deckId) return;

    const deckBuilder = new YGODeckToImage({
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    deckBuilder.downloadYdk({ fileName: `${fileName}.ydk` });
  };

  const downloadDeckAsPng = async () => {
    if (!deck || !deckId) return;

    const deckBuilder = new YGODeckToImage({
      name: deckId.replace("deck_", ""),
      mainDeck: deck.mainDeck,
      extraDeck: deck.extraDeck,
    });

    await deckBuilder.toImage({ fileName: `${fileName}.png`, download: true });
  };

  const handleEdit = () => {
    navigate(`/deckbuilder?edit=${deckId}`);
  };

  const handleDuel = () => {
    navigate(`/duel?deck=deck_${deckId}`);
  };

  const goBack = () => {
    navigate("/my/decks");
  };

  const getCardCountString = () => {
    if (!deck) return "";

    const mainCount = deck.mainDeck?.length || 0;
    const extraCount = deck.extraDeck?.length || 0;
    const sideCount = deck.sideDeck?.length || 0;

    return `${mainCount} Main | ${extraCount} Extra${
      sideCount > 0 ? ` | ${sideCount} Side` : ""
    }`;
  };

  if (loading) {
    return (
      <div className="deck-detail-page">
        <div className="loading-indicator">Loading deck details...</div>
      </div>
    );
  }

  if (!deck || !deckId) {
    return (
      <div className="deck-detail-page">
        <div className="message-container">
          <p className="error-message">Deck not found</p>
          <button onClick={goBack} className="btn btn-primary">
            Back to My Decks
          </button>
        </div>
      </div>
    );
  }

  // Group cards by type for organized display
  const cardsByType = {
    monsters: deck.mainDeck.filter((card: any) =>
      card.type.includes("Monster")
    ),
    spells: deck.mainDeck.filter((card: any) => card.type.includes("Spell")),
    traps: deck.mainDeck.filter((card: any) => card.type.includes("Trap")),
    extra: deck.extraDeck || [],
    side: deck.sideDeck || [],
  };

  return (
    <div className="deck-detail-page">
      <div className="deck-detail-header">
        <button onClick={goBack} className="back-button">
          ← Back to My Decks
        </button>

        <div className="deck-title-section">
          <h1>{deckId.replace("deck_", "")}</h1>
          <span className="deck-count">{getCardCountString()}</span>
          {deck.createdAt && (
            <span className="deck-created">
              Created: {new Date(deck.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="deck-actions">
          <button onClick={handleDuel} className="btn btn-primary">
            Duel
          </button>
          <button onClick={downloadDeckAsYdk} className="btn btn-outline">
            Download YDK
          </button>
          <button onClick={downloadDeckAsPng} className="btn btn-outline">
            Download PNG
          </button>
          <button onClick={handleEdit} className="btn btn-secondary">
            Edit Deck
          </button>
        </div>
      </div>

      <div className="deck-content">
        <div className="deck-cards-container">
          <div className="deck-section main-deck">
            <h2>Main Deck ({deck.mainDeck.length})</h2>

            {cardsByType.monsters.length > 0 && (
              <div className="card-type-section">
                <h3>Monsters ({cardsByType.monsters.length})</h3>
                <div className="card-grid">
                  {cardsByType.monsters.map((card: any, index: number) => (
                    <div
                      key={`monster-${card.id}-${index}`}
                      className="card-item"
                    >
                      <img
                        src={
                          card.card_images[0]?.image_url_small ||
                          `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                        }
                        alt={card.name}
                        title={card.name}
                      />
                      <div className="card-count-badge">
                        {
                          deck.mainDeck.filter((c: any) => c.id === card.id)
                            .length
                        }
                        x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cardsByType.spells.length > 0 && (
              <div className="card-type-section">
                <h3>Spells ({cardsByType.spells.length})</h3>
                <div className="card-grid">
                  {cardsByType.spells.map((card: any, index: number) => (
                    <div
                      key={`spell-${card.id}-${index}`}
                      className="card-item"
                    >
                      <img
                        src={
                          card.card_images[0]?.image_url_small ||
                          `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                        }
                        alt={card.name}
                        title={card.name}
                      />
                      <div className="card-count-badge">
                        {
                          deck.mainDeck.filter((c: any) => c.id === card.id)
                            .length
                        }
                        x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cardsByType.traps.length > 0 && (
              <div className="card-type-section">
                <h3>Traps ({cardsByType.traps.length})</h3>
                <div className="card-grid">
                  {cardsByType.traps.map((card: any, index: number) => (
                    <div key={`trap-${card.id}-${index}`} className="card-item">
                      <img
                        src={
                          card.card_images[0]?.image_url_small ||
                          `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                        }
                        alt={card.name}
                        title={card.name}
                      />
                      <div className="card-count-badge">
                        {
                          deck.mainDeck.filter((c: any) => c.id === card.id)
                            .length
                        }
                        x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {cardsByType.extra.length > 0 && (
            <div className="deck-section extra-deck">
              <h2>Extra Deck ({cardsByType.extra.length})</h2>
              <div className="card-grid">
                {cardsByType.extra.map((card: any, index: number) => (
                  <div key={`extra-${card.id}-${index}`} className="card-item">
                    <img
                      src={
                        card.card_images[0]?.image_url_small ||
                        `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                      }
                      alt={card.name}
                      title={card.name}
                    />
                    <div className="card-count-badge">
                      {
                        deck.extraDeck.filter((c: any) => c.id === card.id)
                          .length
                      }
                      x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cardsByType.side.length > 0 && (
            <div className="deck-section side-deck">
              <h2>Side Deck ({cardsByType.side.length})</h2>
              <div className="card-grid">
                {cardsByType.side.map((card: any, index: number) => (
                  <div key={`side-${card.id}-${index}`} className="card-item">
                    <img
                      src={
                        card.card_images[0]?.image_url_small ||
                        `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`
                      }
                      alt={card.name}
                      title={card.name}
                    />
                    <div className="card-count-badge">
                      {
                        deck.sideDeck.filter((c: any) => c.id === card.id)
                          .length
                      }
                      x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckDetailPage;
