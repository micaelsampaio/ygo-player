import { Card, YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../../../../core/YGODuel";
import type { YGODuelUIEvents } from "../../../../core/YGODuelUIEvents";
import { useEffect, useRef, useState } from "react";
import { stopPropagationCallback } from "../../../../scripts/utils";

import { clickableProps } from "../../../components/a11y";
import { cardBadge, cardBattleStats, cardFrameKind, cardLevelInfo, cardNameFontSize, cardPendulumScale, cardTypeStrip } from "./card-detail-info";
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


  if (!card || !cardData) return <div className="ygo-selected-card-menu ygo-md-card-panel">
    <div className="ygo-flex ygo-flex-col ygo-gap-2 ygo-items-center">
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ width: "80%" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px", width: "150px" }}></div>
      <div className="ygo-skeleton-block ygo-skeleton-light" style={{ height: "200px" }}></div>
    </div>
  </div >

  const badge = cardBadge(card);
  const level = cardLevelInfo(card);
  const stats = cardBattleStats(card);
  const scale = cardPendulumScale(card);
  const frame = cardFrameKind(card);

  return (
    <div className={`ygo-selected-card-menu ygo-md-card-panel ygo-md-frame-${frame}`}
      onMouseMove={stopPropagationCallback}
      role="presentation"
      onClick={stopPropagationCallback}
    >
      <span className="ygo-md-corners" aria-hidden="true" />

      <div className="ygo-md-card-header" title={card.name}
        {...clickableProps(openCardHighlighted)}
      >
        <span className="ygo-md-card-name" style={{ fontSize: cardNameFontSize(card.name) }}>{card.name}</span>
        {badge && <span className={`ygo-md-badge ygo-md-badge-${badge.key}`} role="img" aria-label={badge.label} title={badge.label}>{badge.glyph}</span>}
      </div>

      <div className="ygo-md-card-body">
        <div className="ygo-md-card-image" {...clickableProps(openCardHighlighted)}>
          <img src={card.images.small_url} alt={card.name} />
        </div>

        <div className="ygo-md-card-stats">
          {level && <div className="ygo-md-stat" title={level.kind === "link" ? "Link" : level.kind === "rank" ? "Rank" : "Level"}>
            {level.kind === "link" ? <LinkIcon /> : <StarIcon rank={level.kind === "rank"} />}
            <span>{level.value}</span>
          </div>}

          {stats && <div className="ygo-md-stat" title="ATK">
            <SwordIcon />
            <span>{stats.atk}</span>
          </div>}

          {stats && stats.def !== null && <div className="ygo-md-stat" title="DEF">
            <ShieldIcon />
            <span>{stats.def}</span>
          </div>}

          {scale !== null && <div className="ygo-md-stat" title="Pendulum Scale">
            <ScaleIcon />
            <span>{scale}</span>
          </div>}

          {(cardData.isSpell || cardData.isTrap) && <div className="ygo-md-stat ygo-md-stat-subtype">
            {cardData.cardTypeIcon && <span className="ygo-card-stats ygo-md-subtype-icon">
              <span className={`ygo-card-stats-icon ${cardData.cardTypeIcon}`} />
            </span>}
            <span>{cardData.cardTypeName}</span>
          </div>}

          <div className="ygo-md-card-id">#{card.id}</div>
        </div>
      </div>

      <div className={`ygo-md-type-strip ygo-md-type-strip-${frame}`}>{cardTypeStrip(card)}</div>

      <div className="ygo-md-card-description" ref={cardDescriptionRef}>
        {cardData.cardDescription}
      </div>
    </div>
  );
}

function StarIcon({ rank }: { rank: boolean }) {
  return <svg className="ygo-md-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill={rank ? "#1a1a1a" : "#d9480f"} stroke={rank ? "#c9a227" : "#ffb347"} strokeWidth="1.5" />
    <path d="M12 4.6l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z" fill={rank ? "#e8c547" : "#ffe08a"} />
  </svg>;
}

function LinkIcon() {
  return <svg className="ygo-md-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#1b4ba3" stroke="#7fb2ff" strokeWidth="1.5" />
    <path d="M9 6.5v11h6.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function SwordIcon() {
  return <svg className="ygo-md-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#e9edf5" />
    <path d="M17.8 4.6l1.6 1.6-7.6 7.6-1.6-1.6z" fill="#2b3245" />
    <path d="M8.4 12.2l3.4 3.4-1.2 1.2-1.1-1.1-2.6 2.6-1.2-1.2 2.6-2.6-1.1-1.1z" fill="#2b3245" />
  </svg>;
}

function ShieldIcon() {
  return <svg className="ygo-md-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#e9edf5" />
    <path d="M12 4.8l6 2.2v4.6c0 3.7-2.6 6.4-6 7.6-3.4-1.2-6-3.9-6-7.6V7z" fill="#2b3245" />
    <path d="M12 7.2v9.6c-2.2-1-3.8-2.9-3.8-5.2V8.6z" fill="#e9edf5" opacity=".35" />
  </svg>;
}

function ScaleIcon() {
  return <svg className="ygo-md-icon" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#0f7c74" stroke="#7fe0d2" strokeWidth="1.5" />
    <path d="M12 6v11M7 8h10M7 8l-2.2 4.5h4.4zM17 8l-2.2 4.5h4.4zM9 17h6" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
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