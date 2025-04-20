import { useLayoutEffect, useMemo, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { YGOGameUtils } from "ygo-core";

interface CardPreviewProps {
  duel: YGODuel;
  card: Card;
  position: { x: number; y: number };
  visible: boolean;
}

export function CardPreview({
  duel,
  card,
  position,
  visible = true,
}: CardPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  // Always fullscreen mode - only one modal
  const fullScreen = true;

  // Get the high-res image URL
  const getHighResImageUrl = () => {
    // Use CDN URL from config or fallback to localhost
    const baseUrl = duel?.config?.cdnUrl || "http://localhost:8080";
    return `${baseUrl}/images/cards/${card.id}.jpg`;
  };

  useLayoutEffect(() => {
    if (!previewRef.current || !visible) return;

    // Position in the center
    const container = previewRef.current;

    // Center of the screen
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
  }, [visible, previewRef.current]);

  const cardData = useMemo(() => {
    if (!card) return null;

    let colorClassName = "";
    let cardTypeIcon = "";
    let cardTypeName = "";
    let cardDescription = card.desc || "";

    const isMonster = YGOGameUtils.isMonster(card);
    const isSpell = YGOGameUtils.isSpell(card);
    const isTrap = YGOGameUtils.isTrap(card);
    const isXyzMonster = card.type.includes("XYZ");
    const isLinkMonster = card.type.includes("Link");

    if (isMonster) {
      colorClassName = "ygo-monster";
    }

    if (isSpell) {
      colorClassName = "ygo-spell";
      cardTypeIcon = "ygo-spell-icon";
      cardTypeName = "Spell Card";
    }

    if (isTrap) {
      colorClassName = "ygo-trap";
      cardTypeIcon = "ygo-trap-icon";
      cardTypeName = "Trap Card";
    }

    return {
      colorClassName,
      cardTypeIcon,
      cardTypeName,
      isMonster,
      isSpell,
      isTrap,
      isXyzMonster,
      isLinkMonster,
      cardDescription,
    };
  }, [card]);

  if (!visible || !cardData) return null;

  return (
    <div
      ref={previewRef}
      className="card-preview-popup fullscreen"
      onMouseMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="card-preview-close"
        onClick={(e) => {
          e.stopPropagation();
          // Hide the preview by dispatching the hide event
          duel.events.dispatch("hide-card-preview");
        }}
      >
        ×
      </div>

      <div className={`card-preview-header ${cardData.colorClassName}`}>
        <h3>{card.name}</h3>
      </div>

      <div className="card-preview-content">
        <div
          className="card-preview-image"
          style={{
            backgroundImage: `url(${getHighResImageUrl()})`,
            height: "auto",
            aspectRatio: "3/4",
          }}
        ></div>

        <div className="card-preview-details">
          <div className={`card-preview-type ${cardData.colorClassName}`}>
            {cardData.cardTypeName || card.type}
          </div>

          {cardData.isMonster && (
            <div className="card-preview-stats-row">
              <div className="card-preview-stats">
                <div className="card-preview-stats-label">
                  {cardData.isXyzMonster ? "Rank" : "Level"}:
                </div>
                <div className="card-preview-stats-value">{card.level}</div>
              </div>

              <div className="card-preview-stats">
                <div className="card-preview-stats-label">ATK:</div>
                <div className="card-preview-stats-value">{card.atk}</div>
              </div>

              {!cardData.isLinkMonster && (
                <div className="card-preview-stats">
                  <div className="card-preview-stats-label">DEF:</div>
                  <div className="card-preview-stats-value">{card.def}</div>
                </div>
              )}
            </div>
          )}

          <div className="card-preview-description">
            {cardData.cardDescription}
          </div>
        </div>
      </div>
    </div>
  );
}
