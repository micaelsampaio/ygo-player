import React, { useEffect, useState } from "react";
import { Card } from "../../types";
import "./CardNotification.css";

interface CardNotificationProps {
  card: Card;
}

const CardNotification: React.FC<CardNotificationProps> = ({ card }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Reset visibility when a new card is added
    setVisible(true);

    // Hide notification after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [card]);

  if (!visible) return null;

  return (
    <div className="card-notification">
      <div className="notification-content">
        <div className="notification-image-container">
          <img
            src={
              card.card_images[0].image_url_small ||
              card.card_images[0].image_url
            }
            alt={card.name}
            className="notification-image"
          />
        </div>
        <div className="notification-text">
          <div className="notification-title">Card Added</div>
          <div className="notification-card-name">{card.name}</div>
        </div>
      </div>
    </div>
  );
};

export default CardNotification;
