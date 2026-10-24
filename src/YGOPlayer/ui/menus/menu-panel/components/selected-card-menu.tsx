import { Card, YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../../../../core/YGODuel";
import type { YGODuelUIEvents } from "../../../../core/YGODuelUIEvents";
import { useEffect, useRef, useState } from "react";
import { stopPropagationCallback } from "../../../../scripts/utils";

import { clickableProps } from "../../../components/a11y";
import { AttributeIcon } from "../../../components/attribute-icon/AttributeIcon";
import { cardBadge, cardFrameKind, cardNameFontSize, cardTypeStrip } from "./card-detail-info";
import { CardDetailStats } from "./card-detail-stats";
import "./card-detail.css";

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
    const onSelectedCard = (data: Parameters<YGODuelUIEvents["set-selected-card"]>[0]) => {
      if (!data.card) return;
      const card = data.card;
      setCard(card)
      setCardData(parseSelectedCard(card))
    };
    duel.events.on("set-selected-card", onSelectedCard);
    return () => duel.events.off("set-selected-card", onSelectedCard);
  }, [duel])


  if (!card || !cardData) return <div className="ygo-selected-card-menu ygo-md-card-panel ygo-md-surface">
    <div className="ygo-flex ygo-flex-col ygo-gap-2 ygo-items-center">
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ width: "80%" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px", width: "150px" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px" }}></div>
    </div>
  </div >

  const badge = cardBadge(card);
  const frame = cardFrameKind(card);

  return (
    <div className={`ygo-selected-card-menu ygo-md-card-panel ygo-md-surface ygo-md-frame-${frame}`}
      onMouseMove={stopPropagationCallback}
      role="presentation"
      onClick={stopPropagationCallback}
    >
      <span className="ygo-md-corners" aria-hidden="true" />

      <div className="ygo-md-card-header" title={card.name}
        {...clickableProps(openCardHighlighted)}
      >
        <span className="ygo-md-card-name" style={{ fontSize: cardNameFontSize(card.name) }}>{card.name}</span>
        {badge && <AttributeIcon kind={badge.key} className="ygo-md-badge" />}
      </div>

      <div className="ygo-md-card-body">
        <div className="ygo-md-card-image" {...clickableProps(openCardHighlighted)}>
          <img src={card.images.small_url} alt={card.name} />
        </div>

        <CardDetailStats card={card} subtype={cardData}>
          <div className="ygo-md-card-id">#{card.id}</div>
        </CardDetailStats>
      </div>

      <div className={`ygo-md-type-strip ygo-md-type-strip-${frame}`}>{cardTypeStrip(card)}</div>

      <div className="ygo-md-card-description" ref={cardDescriptionRef}>
        {cardData.cardDescription}
      </div>
    </div>
  );
}

/** The API's card type label ("Quick-Play Spell", "Counter Trap"…), or "" when the card data has none. */
function humanReadableCardType(card: Card): string {
  return "humanReadableCardType" in card && typeof card.humanReadableCardType === "string" ? card.humanReadableCardType : "";
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
    const type = humanReadableCardType(card);
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
    const type = humanReadableCardType(card);
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

  if (isSpell) {
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