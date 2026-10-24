import type { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { useEffect, useId, useMemo, useRef } from "react";
import { parseSelectedCard } from "./menu-panel/components/selected-card-menu";
import { Modal } from "../components/Modal";
import { AttributeIcon } from "../components/attribute-icon/AttributeIcon";
import { bindEscapeToCancel } from "../components/escape-to-cancel";
import { cardBadge, cardFrameKind, cardNameFontSize, cardTypeStrip } from "./menu-panel/components/card-detail-info";
import { CardDetailStats } from "./menu-panel/components/card-detail-stats";

import { clickableProps } from "../components/a11y";
import "./menu-panel/components/card-detail.css";
import "./card-highlight.css";

/** The enlarged card (click the card name / art in the panel, or long-press a card). */
export function SelectedCardHighlightedMenu({
  duel,
  card,
  visible = true,
}: {
  duel: YGODuel;
  card: Card;
  visible: boolean;
}) {
  const closeRef = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const cardData = useMemo(() => parseSelectedCard(card), [card]);
  const open = visible && !!card && !!cardData;

  const closeDialog = () => {
    duel.events.dispatch("close-ui-menu", { group: "card-highlight" });
  }

  // Escape closes the dialog (before the global Escape that opens Settings).
  useEffect(() => {
    if (!open) return;
    return bindEscapeToCancel(document, () => duel.events.dispatch("close-ui-menu", { group: "card-highlight" }));
  }, [open, duel]);

  // Move focus into the dialog, and give it back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, [open]);

  if (!open || !cardData) return null;

  const badge = cardBadge(card);
  const frame = cardFrameKind(card);

  return <Modal.Dialog close={closeDialog} visible className="ygo-md-highlight-dialog" labelledBy={nameId} onContextMenu={() => {
    duel.events.dispatch("close-ui-menu", { type: "selected-card-highlight" });
  }}>
    <div className={`ygo-md-surface ygo-md-highlight ygo-md-frame-${frame}`}>
      <span className="ygo-md-corners" aria-hidden="true" />

      <div className="ygo-md-highlight-art">
        <img src={card.images.small_url} alt={card.name} />
      </div>

      <div className="ygo-md-highlight-info">
        <div className="ygo-md-card-header ygo-md-highlight-header">
          <h2 id={nameId} className="ygo-md-card-name" title={card.name} style={{ fontSize: cardNameFontSize(card.name, 28) }}>{card.name}</h2>
          {badge && <AttributeIcon kind={badge.key} className="ygo-md-badge" />}
          <div ref={closeRef} className="ygo-close ygo-md-highlight-close" {...clickableProps(closeDialog, "Close")}></div>
        </div>

        <CardDetailStats card={card} subtype={cardData} className="ygo-md-highlight-stats">
          <div className="ygo-md-card-id">#{card.id}</div>
        </CardDetailStats>

        <div className={`ygo-md-type-strip ygo-md-type-strip-${frame}`}>{cardTypeStrip(card)}</div>

        {/* Focusable so keyboard users can scroll long effects. */}
        <div className="ygo-md-card-description ygo-md-highlight-description" tabIndex={0} aria-label="Card text">
          {cardData.cardDescription}
        </div>
      </div>
    </div>
  </Modal.Dialog>;
}
