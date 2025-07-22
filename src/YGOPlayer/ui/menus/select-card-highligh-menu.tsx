import { YGODuel } from "../../core/YGODuel";
import { Card } from "ygo-core";
import { useMemo, useRef } from "react";
import { parseSelectedCard } from "./selected-card-menu";
import { Modal } from "../components/Modal";

export function SelectedCardHighlightedMenu({
  duel,
  card,
  visible = true,
}: {
  duel: YGODuel;
  card: Card;
  visible: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const cardData = useMemo(() => parseSelectedCard(card), [card]);

  const closeDialog = () => {
    duel.events.dispatch("close-ui-menu", { group: "card-highlight" });
  }

  if (!visible) return null;
  if (!card) return null;
  if (!cardData) return null;

  return <Modal.Dialog close={closeDialog} visible onContextMenu={() => {
    duel.events.dispatch("close-ui-menu", { type: "selected-card-highlight" });
  }}>
    <Modal.Body>
      <div className="ygo-card-highlight ygo-flex ygo-gap-4">
        <div>
          <img src={card.images.small_url} className="ygo-card" />
        </div>

        <div className="ygo-flex ygo-flex-col ygo-gap-2" style={{ maxHeight: "80dvh", width: "100%" }}>

          <div className="ygo-flex ygo-gap-4 ygo-items-center ygo-justify-center">
            <div className={`ygo-text-xl ygo-p-1 ygo-flex-grow-1 ${cardData.colorClassName}`}>
              {card.name}
            </div>
            <div>
              <div className="ygo-close" onClick={closeDialog}></div>
            </div>
          </div>

          {
            (cardData.isSpell || cardData.isTrap) && <>
              <div className="ygo-card-stats">
                <div>{cardData.cardTypeName}</div>
              </div>
            </>
          }

          {
            cardData.isMonster && <>
              <div className="ygo-flex ygo-gap-2 ygo-p-1">

                {
                  cardData.isLinkMonster && <div className="ygo-card-stats">
                    <div className="ygo-card-stats-icon ygo-card-stats-icon-link-monster"></div>
                    <div>{card.linkval ?? "0"}</div>
                  </div>
                }
                {
                  cardData.isXyzMonster && <div className="ygo-card-stats">
                    <div className="ygo-card-stats-icon ygo-card-stats-icon-rank"></div>
                    <div>{card.level ?? "0"}</div>
                  </div>
                }
                {
                  (!cardData.isLinkMonster && !cardData.isXyzMonster && cardData.isMonster) && <div className="ygo-card-stats">
                    <div className="ygo-card-stats-icon ygo-card-stats-icon-level"></div>
                    <div>{card.level ?? "0"}</div>
                  </div>
                }

                <div className="ygo-card-stats">
                  <div className="ygo-card-stats-icon ygo-card-stats-icon-atk"></div>
                  <div>{card.atk ?? "0"}</div>
                </div>

                {!cardData.isLinkMonster && <>
                  <div className="ygo-card-stats">
                    <div className="ygo-card-stats-icon ygo-card-stats-icon-def"></div>
                    <div>{card.def ?? "0"}</div>
                  </div>
                </>}
              </div>

            </>
          }

          <div className={`ygo-content-card-type-border ygo-p-1 ${cardData.borderColorClassName} `}>
            {cardData.type}
          </div>

          <div className="ygo-text-lg ygo-p-1 ygo-scroll-y">
            {cardData.cardDescription}
          </div>
        </div>

      </div>
    </Modal.Body>
  </Modal.Dialog >
    ;
}
