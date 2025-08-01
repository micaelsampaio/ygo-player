import { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { YGOGameUtils } from "ygo-core";
import { stopPropagationCallback } from "../../scripts/utils";

export function SelectedCardMenu({
  duel,
  card,
  isMobile = false,
  visible = true,
}: {
  duel: YGODuel;
  card: Card;
  isMobile: boolean,
  visible: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const cardDescriptionRef = useRef<HTMLDivElement>(null);

  const openCardHighlighted = () => {
    duel.events.dispatch("toggle-ui-menu", {
      group: "card-highlight",
      type: "selected-card-highlight",
      data: {
        duel,
        card
      }
    });
  }

  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const placeholder = isMobile ? duel.duelScene.selectedCardPlaceholderMobile[card.originalOwner] ?? duel.duelScene.selectedCardPlaceholderMobile[1] : duel.duelScene.selectedCardPlaceholder;
    const container = menuRef.current!;
    const { x, y, width, height } = getTransformFromCamera(duel, placeholder);

    if (isMobile) {
      container.style.top = y + "px";
      container.style.left = x + "px";
      container.style.width = width + "px";
      container.style.maxHeight = height + "px";
    } else {
      const maxWidth = x + width;
      const newWidth = Math.min(300, maxWidth);
      container.style.top = y + "px";
      container.style.left = 0 + "px";
      container.style.width = newWidth + "px";
      container.style.maxHeight = height + "px";
    }

  }, [visible, menuRef.current, card, duel.duelScene.selectedCardPlaceholder, isMobile]);

  useEffect(() => {
    if (cardDescriptionRef.current) {
      cardDescriptionRef.current.scrollTop = 0;
    }
  }, [card]);

  const cardData = useMemo(() => parseSelectedCard(card), [card]);

  if (!visible) return null;
  if (!card) return null;
  if (!cardData) return null;

  return (
    <div
      // didnt like to put class is mobile but css queries were not working as tehy should
      className={`ygo-selected-card-menu ${isMobile ? "ygo-is-mobile" : ""}`}
      ref={menuRef}
      onMouseMove={stopPropagationCallback}
      onClick={stopPropagationCallback}

      onContextMenu={e => {
        stopPropagationCallback(e);
        duel.events.dispatch("clear-ui-action");
        duel.events.dispatch("set-selected-card", { card: null });
      }}
    >
      <div className={`ygo-selected-card-header-container ygo-player-${card.owner}-bg-bottom`}>
        <div className="ygo-card-image-header-container">
          <div className="ygo-card-image" onClick={openCardHighlighted} style={{ backgroundImage: `url(${card.images.small_url})` }}></div>
        </div>
        <div style={{ flexGrow: 1, width: "100%" }}>
          <div
            className={`ygo-selected-card-header ${cardData.colorClassName}`}
            style={{ fontSize: "20px", width: "100%" }}
          >
            <div className="ygo-selected-card-header-content">
              <div className="ygo-card-name ygo-card-name-header">
                {card.name}
              </div>
            </div>
          </div>
          <div className={` ygo-flex ygo-card-data-container`}>
            <div className="ygo-card-image ygo-card-header" onClick={openCardHighlighted} style={{ backgroundImage: `url(${card.images.small_url})` }}></div>
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
                    <div>{card.currentAtk ?? card.atk ?? "0"}</div>
                  </div>
                  <div>
                    {!cardData.isLinkMonster && <div className="ygo-card-stats">
                      <div className="ygo-card-stats-icon ygo-card-stats-icon-def"></div>
                      <div>{card.currentDef ?? card.def ?? "0"}</div>
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
        </div>
      </div>

      <div className={`mb-2 ygo-text-sm ygo-text-bold ${cardData.colorClassName} ygo-p-1`} >{cardData.type}</div>

      <div className="ygo-scroll-y ygo-grow ygo-text-md ygo-card-description" ref={cardDescriptionRef}>
        {cardData.cardDescription}
      </div>
    </div>
  );
}


export function parseSelectedCard(card: Card) {
  if (!card) return null;

  let colorClassName = "";
  let borderColorClassName = "";
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
    borderColorClassName = "ygo-link-card-border";
  } else if (isXyzMonster) {
    colorClassName = "ygo-xyz-card-bg";
    borderColorClassName = "ygo-xyz-card-boder";
  } else if (isSynchroMonster) {
    colorClassName = "ygo-synchro-card-bg";
    borderColorClassName = "ygo-synchro-card-border";
  } else if (isMonster) {
    colorClassName = "ygo-effect-monster-card-bg";
    borderColorClassName = "ygo-effect-monster-card-border";
  } else if (isSpell) {
    colorClassName = "ygo-spell-card-bg";
    borderColorClassName = "ygo-spell-card-border";
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
    borderColorClassName = "ygo-trap-card-border";
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
    borderColorClassName = "ygo-effect-monster-border";
  }

  let typeLine = "";

  if (isSpell || isTrap) {
    typeLine = `[Spell]`;
  } else if (isTrap) {
    typeLine = `[Trap]`;
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
    borderColorClassName,
    isMonster,
    isLinkMonster,
    isXyzMonster,
    isSynchroMonster,
    isSpell,
    isTrap,
    cardTypeIcon,
    cardTypeName,
  };
}