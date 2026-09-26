import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { YGODuel } from "../../../core/YGODuel";
import { YGOStatic } from "../../../core/YGOStatic";
import { stopPropagationCallback } from "../../../scripts/utils";
import { CandidateGroup, isSelectionValid, PromptData, promptTitle } from "../../assist-prompt";
import { PileKind, pileTabs } from "./pile-choice";
import "./style.css";

const PILE_FIELD: Record<PileKind, string | null> = {
  deck: "mainDeck", gy: "graveyard", banished: "banishedZone", extra: "extraDeck", hand: "hand", field: null,
};

/**
 * An engine card prompt answered in a pile view: the valid choices as a
 * card grid (one tab per pile), the rest of the pile dimmed for context.
 * Picking follows the prompt exactly as the panel's list does (it shares
 * its selection and responses); closing only minimizes it — the panel
 * keeps a button to bring it back.
 */
export function PileChoicePopup({ duel, prompt, container, selected, busy, pendingKey, onToggle, onPick, onConfirm, onCancel, onFinish, onClose }: {
  duel: YGODuel;
  prompt: PromptData;
  container: HTMLElement;
  /** "card" prompts: the candidate indices picked so far. */
  selected: number[];
  busy: boolean;
  pendingKey: string | null;
  onToggle: (group: CandidateGroup) => void;
  /** "unselectCard" prompts: each pick is sent at once. */
  onPick: (index: number) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  onFinish?: () => void;
  onClose: () => void;
}) {
  const tabs = useMemo(() => pileTabs(prompt), [prompt]);
  const [tabKey, setTabKey] = useState(() => tabs[0]?.key);
  const tab = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  const [onlyChoices, setOnlyChoices] = useState<Record<string, boolean>>({});
  const showOnly = onlyChoices[tab?.key ?? ""] ?? tab?.pile === "deck";
  const [search, setSearch] = useState("");
  const candidates = prompt.candidates ?? [];
  const me = YGOStatic.playerIndex;
  const nameOf = (code: number) => duel.ygo?.state?.getCardData(code)?.name;
  const dataOf = (code: number) => duel.ygo?.state?.getCardData(code) as any;
  const isUnselect = prompt.kind === "unselectCard";
  const valid = !isUnselect && isSelectionValid(prompt, selected);
  const max = prompt.max ?? 1;

  useEffect(() => {
    const unsubscribe = duel.globalHotKeysManager.on("escPressed", onClose);
    return () => unsubscribe();
  }, [duel, onClose]);

  if (!tab) return null;

  const matches = (code: number) => !search || (nameOf(code) ?? "").toLowerCase().includes(search.toLowerCase());
  const choiceCodes = new Set(tab.choices.map((c) => c.code));
  // The rest of this pile, where the board knows its cards (a hidden Deck shows only the choices).
  const owner = tab.mine ? me : 1 - me;
  const field = PILE_FIELD[tab.pile];
  const rest: any[] = showOnly || !field
    ? []
    : ((duel.ygo?.state?.fields?.[owner] as any)?.[field] ?? []).filter((c: any) => c && c.id && !choiceCodes.has(c.id) && matches(c.id));

  const showInfo = (code: number) => {
    const card = dataOf(code);
    if (card) duel.gameActions.setSelectedCard({ player: owner, card });
  };

  const pickedIn = (group: CandidateGroup) => isUnselect
    ? group.indices.filter((i) => candidates[i]?.selected).length
    : group.indices.filter((i) => selected.includes(i)).length;
  const totalPicked = isUnselect ? candidates.filter((c) => c.selected).length : selected.length;

  return createPortal(
    <div className="game-popup ygo-pile-choice" role="presentation" onMouseMove={stopPropagationCallback} onClick={stopPropagationCallback}>
      <div className="game-popup-dialog ygo-menu-view-main-deck ygo-pile-choice-dialog" role="dialog" aria-modal="true" aria-label={promptTitle(prompt, nameOf)}>
        <div className="game-popup-header">
          <div className="game-popup-header-title">{promptTitle(prompt, nameOf)}</div>
          <div>
            <button aria-label="Minimize (reopen from the panel)" title="Minimize — reopen from the panel" className="ygo-close" onClick={onClose}></button>
          </div>
        </div>

        {tabs.length > 1 && (
          <div className="ygo-pile-choice-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} role="tab" type="button" aria-selected={t.key === tab.key}
                className={`ygo-pile-choice-tab${t.key === tab.key ? " active" : ""}`} onClick={() => setTabKey(t.key)}>
                {t.label} <span className="ygo-pile-choice-tab-count">{t.choices.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="game-popup-content-no-scroll ygo-flex ygo-gap-2 ygo-items-center ygo-pt-0">
          <div className="ygo-menu-view-main-deck-search-container">
            <input className="ygo-menu-view-main-deck-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a card..." aria-label="Search the choices" />
          </div>
          {field && (
            <label className="ygo-pile-choice-toggle">
              <input type="checkbox" checked={showOnly} onChange={(e) => setOnlyChoices((prev) => ({ ...prev, [tab.key]: e.target.checked }))} />
              Show only choices
            </label>
          )}
        </div>

        <div className="game-popup-content">
          <div className="ygo-menu-view-main-deck-cards ygo-pile-choice-cards">
            {tab.choices.filter((c) => matches(c.code)).map(({ group, code }) => {
              const picked = pickedIn(group);
              const copies = group.indices.length;
              const name = nameOf(code) ?? `#${code}`;
              const busyHere = pendingKey === `pick:${group.indices[0]}`;
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`ygo-pile-choice-card${picked ? " picked" : ""}`}
                  aria-pressed={picked > 0}
                  aria-label={`${name}${copies > 1 ? `, ${copies} copies` : ""}${picked ? ", picked" : ""}`}
                  disabled={busy}
                  aria-busy={busyHere}
                  onMouseEnter={() => showInfo(code)}
                  onFocus={() => showInfo(code)}
                  onClick={() => (isUnselect ? onPick(group.indices[0]) : onToggle(group))}
                >
                  <img src={dataOf(code)?.images?.small_url} alt="" className="ygo-card" />
                  {copies > 1 && <span className="ygo-pile-choice-copies">×{copies}</span>}
                  {picked > 0 && <span className="ygo-pile-choice-check" aria-hidden="true">{max > 1 ? picked : "✓"}</span>}
                </button>
              );
            })}
            {rest.map((card: any, i: number) => (
              <img key={`rest:${card.id}:${i}`} src={card.images?.small_url} alt={card.name ?? ""} title={`${card.name ?? ""} — not a choice`}
                className="ygo-card ygo-pile-choice-rest" onMouseEnter={() => showInfo(card.id)} />
            ))}
          </div>
        </div>

        <div className="ygo-pile-choice-footer">
          <span className="ygo-pile-choice-count" aria-live="polite">
            {isUnselect ? `${totalPicked} picked` : `${totalPicked} of ${max} picked`}
          </span>
          {!isUnselect && (
            <button type="button" className="ygo-pile-choice-confirm" disabled={busy || !valid} aria-busy={pendingKey === "confirm"} onClick={onConfirm}>
              {pendingKey === "confirm" ? <span className="ygo-inline-spinner" aria-hidden="true" /> : "Confirm"}
            </button>
          )}
          {isUnselect && onFinish && (
            <button type="button" className="ygo-pile-choice-confirm" disabled={busy} onClick={onFinish}>{prompt.finishable ? "Done" : "Cancel"}</button>
          )}
          {!isUnselect && onCancel && (
            <button type="button" className="ygo-pile-choice-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
          )}
        </div>
      </div>
    </div>,
    container,
  );
}
