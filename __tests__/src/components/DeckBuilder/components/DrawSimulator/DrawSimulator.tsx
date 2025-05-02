import React, { useState, useEffect } from "react";
import "./DrawSimulator.css";
import { getCardImageUrl } from "../../../../utils/cardImages";
import { useNavigate } from "react-router-dom";

const DrawSimulator = ({ deck, onCardSelect }) => {
  const [drawnCards, setDrawnCards] = useState([]);
  const [remainingDeck, setRemainingDeck] = useState(deck);
  const navigate = useNavigate();

  useEffect(() => {
    setRemainingDeck(deck);
    setDrawnCards([]);
  }, [deck]);

  const drawCard = () => {
    if (remainingDeck.length === 0) return;

    const cardIndex = Math.floor(Math.random() * remainingDeck.length);
    const card = remainingDeck[cardIndex];
    setDrawnCards([...drawnCards, card]);
    setRemainingDeck(remainingDeck.filter((_, index) => index !== cardIndex));
  };

  const resetDeck = () => {
    setRemainingDeck(deck);
    setDrawnCards([]);
  };

  const handleCardClick = (e, card) => {
    // If Ctrl/Cmd key is pressed, navigate to card details
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      navigate(`/cards/database/card/${card.id}`);
    } else if (onCardSelect) {
      // Use the provided card select handler
      onCardSelect(card, e);
    }
  };

  return (
    <div className="draw-simulator">
      <div className="drawn-cards">
        {drawnCards.map((card, index) => (
          <img
            key={index}
            src={getCardImageUrl(card)}
            alt={card.name}
            onClick={(e) => handleCardClick(e, card)}
          />
        ))}
      </div>
      <button onClick={drawCard} disabled={remainingDeck.length === 0}>
        Draw Card
      </button>
      <button onClick={resetDeck}>Reset Deck</button>
    </div>
  );
};

export default DrawSimulator;
