import { Card, YGOGameUtils } from "ygo-core";
import { YGODuel } from "../../../../core/YGODuel";
import { useEffect, useMemo, useRef, useState } from "react";
import { stopPropagationCallback } from "../../../../scripts/utils";

export function SelectedCardMenu({
  duel,
}: {
  duel: YGODuel;
}) {
  const [card, setCard] = useState<Card | null>(null)
  const [cardData, setCardData] = useState(parseSelectedCard(card))
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

  useEffect(() => {
    if (cardDescriptionRef.current) {
      cardDescriptionRef.current.scrollTop = 0;
    }
  }, [card]);

  useEffect(() => {
    duel.events.on("set-selected-card", (data: any) => {
      if (!data.card) return;
      const card = data.card;
      setCard(card)
      setCardData(parseSelectedCard(card))
    });
  }, [])


  if (!card || !cardData) return <div className="ygo-selected-card-menu">
    <div className="ygo-flex ygo-flex-col ygo-gap-2 ygo-items-center">
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ width: "80%" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px", width: "150px" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px" }}></div>
    </div>
  </div >

  return (
    <div className="ygo-selected-card-menu"
      onMouseMove={stopPropagationCallback}
      onClick={stopPropagationCallback}
    >
      <div className="ygo-card-header"
        onClick={openCardHighlighted}
      >
        {card.name}
      </div>

      <div className="ygo-card-image" onClick={openCardHighlighted}>
        <img src={card.images.small_url} alt={card.name} />
      </div>

      <div className="ygo-flex ygo-flex-col ygo-gap-1">
        <div className="ygo-text-sm">{card.id}</div>
        <div>
          <span>
            {cardData.type}
          </span>
          {' '}
          {(cardData.isSpell || cardData.isTrap) && (
            <span>
              [{cardData.cardTypeName}]
            </span>
          )}

        </div>

        {cardData.isMonster && (
          <div className="ygo-flex ygo-gap-1">
            {cardData.isLinkMonster && (
              <span>[L{card.linkval}]</span>
            )}

            {cardData.isXyzMonster && (
              <span>[R{card.level}]</span>
            )}

            {!cardData.isLinkMonster && !cardData.isXyzMonster && (
              <span>[✪ {card.level}]</span>
            )}

            <span>
              {card.currentAtk ?? card.atk ?? "0"}

              {!cardData.isLinkMonster && <>
                {' '} / {' '}{card.currentDef ?? card.def ?? "0"}
              </>}
            </span>
          </div>
        )}
      </div>

      <div className="ygo-card-description">
        {cardData.cardDescription}
      </div>
    </div>
  );
}


export function parseSelectedCard(card: Card | null) {
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