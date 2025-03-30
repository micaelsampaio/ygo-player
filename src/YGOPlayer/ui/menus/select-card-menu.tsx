import { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { useLayoutEffect, useMemo, useRef } from "react";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { YGOGameUtils } from "ygo-core";

export function SelectedCardMenu({
  duel,
  card,
  visible = true,
}: {
  duel: YGODuel;
  card: Card;
  visible: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const placeholder = duel.duelScene.selectedCardPlaceholder;
    const container = menuRef.current!;
    const { x, y, width, height } = getTransformFromCamera(duel, placeholder);
    container.style.top = y + "px";
    container.style.left = 0 + "px";
    container.style.width = width + "px";
    container.style.maxHeight = height + "px";
  }, [visible, menuRef.current, card, duel.duelScene.selectedCardPlaceholder]);

  const cardData = useMemo(() => {
    if (!card) return null;

    let colorClassName = "";
    let cardTypeIcon = "";
    let cardTypeName = "";

    const isMonster = YGOGameUtils.isMonster(card);
    const isLinkMonster = YGOGameUtils.isLinkMonster(card);
    const isXyzMonster = YGOGameUtils.isXYZMonster(card);
    const isSynchroMonster = YGOGameUtils.isSynchroMonster(card);
    const isSpell = YGOGameUtils.isSpell(card);
    const isTrap = YGOGameUtils.isTrap(card);

    if (isLinkMonster) {
      colorClassName = "ygo-link-card-bg";
    } else if (isXyzMonster) {
      colorClassName = "ygo-xyz-card-bg";
    } else if (isSynchroMonster) {
      colorClassName = "ygo-synchro-card-bg";
    } else if (isMonster) {
      colorClassName = "ygo-effect-monster-card-bg";
    } else if (isSpell) {
      colorClassName = "ygo-spell-card-bg";
      const type = (card as any).humanReadableCardType;
      cardTypeName = type;

      if (type === "Field Spell") {
        cardTypeIcon = "ygo-card-stats-icon-field";
      }
      else if (type === "Counter Spell") {
        cardTypeIcon = "ygo-card-stats-icon-counter";
      }
      else if (type === "Continuous Spell") {
        cardTypeIcon = "ygo-card-stats-icon-continuous";
      }
      else if (type === "Equip Spell") {
        cardTypeIcon = "ygo-card-stats-icon-equip";
      }
      else if (type === "Quick-Play Spell") {
        cardTypeIcon = "ygo-card-stats-icon-quick";
      }
      else if (type === "Ritual Spell") {
        cardTypeIcon = "ygo-card-stats-icon-ritual";
      }
      else {
        cardTypeIcon = "";
        cardTypeName = "Normal Spell";
      }
    } else if (isTrap) {
      colorClassName = "ygo-trap-card-bg";
      const type = (card as any).humanReadableCardType;
      cardTypeName = type;

      if (type === "Counter Trap") {
        cardTypeIcon = "ygo-card-stats-icon-counter";
      }
      else if (type === "Continuous Trap") {
        cardTypeIcon = "ygo-card-stats-icon-continuous";
      }
      else if (type === "Equip Trap") {
        cardTypeIcon = "ygo-card-stats-icon-equip";
      } else {
        cardTypeIcon = "";
        cardTypeName = "Normal Trap";
      }
    } else {
      colorClassName = "ygo-effect-monster-card";
    }

    let typeLine = "";

    if (isSpell || isTrap) {
      typeLine = `[${cardTypeName}]`;
    } else {
      typeLine = `[${card.typeline && card.typeline.join("/")}]`;
    }

    const cardDescription = String(card.desc || "").split('\n').map((line, index) => (
      <div key={index}>{line}</div>
    ));

    return {
      type: typeLine,
      cardDescription,
      colorClassName,
      isMonster,
      isLinkMonster,
      isXyzMonster,
      isSynchroMonster,
      isSpell,
      isTrap,
      cardTypeIcon,
      cardTypeName,
    };
  }, [card]);

  if (!visible) return null;
  if (!card) return null;
  if (!cardData) return null;

  return (
    <div
      className="selected-card-menu"
      ref={menuRef}
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
        className={`ygo-selected-card-header ${cardData.colorClassName}`}
        style={{ fontSize: "20px" }}
      >
        <div className="ygo-selected-card-header-content">
          <div className="ygo-card-name">
            {card.name}
          </div>
        </div>
      </div>

      <div className={`ygo-player-${card.owner}-bg-bottom ygo-flex ygo-card-data-container`}>
        <div className="ygo-card-image" style={{ backgroundImage: `url(${duel.config.cdnUrl}/images/cards_small/${card.id}.jpg)` }}></div>
        <div className="ygo-card-stats-container">
          {cardData.isMonster && (
            <>
              {
                cardData.isLinkMonster && <div className="ygo-card-stats">
                  <div className="ygo-card-stats-icon ygo-card-stats-icon-link-monster"></div>
                  <div>{card.linkval}</div>
                </div>
              }
              {
                cardData.isXyzMonster && <div className="ygo-card-stats">
                  <div className="ygo-card-stats-icon ygo-card-stats-icon-rank"></div>
                  <div>{card.level}</div>
                </div>
              }
              {
                (!cardData.isLinkMonster && !cardData.isXyzMonster && cardData.isMonster) && <div className="ygo-card-stats">
                  <div className="ygo-card-stats-icon ygo-card-stats-icon-level"></div>
                  <div>{card.level}</div>
                </div>
              }

              <div className="ygo-card-stats">
                <div className="ygo-card-stats-icon ygo-card-stats-icon-atk"></div>
                <div>{card.currentAtk}</div>
              </div>
              <div>
                {!cardData.isLinkMonster && <div className="ygo-card-stats">
                  <div className="ygo-card-stats-icon ygo-card-stats-icon-def"></div>
                  <div>{card.currentDef}</div>
                </div>}
              </div>
            </>
          )}

          {(cardData.isSpell || cardData.isTrap) && (
            <div className="ygo-card-stats">
              {cardData.cardTypeIcon && <div className={`ygo-card-stats-icon ${cardData.cardTypeIcon}`}></div>}
              <div>{cardData.cardTypeName}</div>
            </div>
          )}
        </div>
      </div>

      <div className={`mb-2 ygo-text-sm ${cardData.colorClassName} ygo-p-1`} >{cardData.type}</div>

      <div className="ygo-scroll-y ygo-grow ygo-text-md ygo-card-description">
        {cardData.cardDescription}
      </div>
    </div>
  );
}
