import { useEffect, useMemo, useState } from "react";
import { YGODuel } from "../../../core/YGODuel";
import { stopPropagationCallback } from "../../../scripts/utils";
import {
  DECK_TAKE_LABELS,
  DeckContents,
  DeckTakeTarget,
  deckTakeError,
  filterDeckEntries,
  readDeckContents,
} from "./deck-search";
import "./style.css";

const TARGETS: DeckTakeTarget[] = ["hand", "graveyard", "banish"];

/**
 * "Show my deck while searching" (deck-search.ts): what's left in your Main
 * Deck as the server lists it — grouped and sorted, never in deck order —
 * and moving one copy of a card out of it.
 */
export function DeckSearchPopup({ duel, visible = true }: { duel: YGODuel; visible: boolean }) {
  const [contents, setContents] = useState<DeckContents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState(true);
  const [filter, setFilter] = useState({ search: "", monster: false, spell: false, trap: false });

  const close = () => duel.events.dispatch("close-ui-menu", { group: "game-popup" });

  useEffect(() => {
    if (!visible) return;
    const ask = () => {
      if (!duel.serverActions.room.send("duel:deck:search")) setError("Searching needs a server duel.");
    };
    const onContents = (data: unknown) => {
      const res = readDeckContents(data);
      if ("error" in res) { setError(res.error); return; }
      // Card data for cards this client only holds as placeholders.
      duel.ygo.state.registerCardData(res.contents.cards.map((c) => c.card).filter(Boolean) as any);
      setContents(res.contents);
      setError(null);
    };
    const onTaken = (data: unknown) => {
      setBusy(false);
      const message = deckTakeError(data);
      if (message) { setError(message); return; }
      setSelected(null);
      ask();
    };
    duel.events.on("deck-search-contents", onContents);
    duel.events.on("deck-search-taken", onTaken);
    ask();
    const unsubscribeEsc = duel.globalHotKeysManager.on("escPressed", close);
    return () => {
      duel.events.off("deck-search-contents", onContents);
      duel.events.off("deck-search-taken", onTaken);
      unsubscribeEsc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, visible]);

  const nameOf = (id: number) => duel.ygo.state.getCardData(id)?.name;
  const shown = useMemo(
    () => (contents ? filterDeckEntries(contents.cards, filter, nameOf) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, filter],
  );

  if (!visible) return null;

  const take = (id: number, to: DeckTakeTarget) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (!duel.serverActions.room.send("duel:deck:take", { id, to, reveal })) setBusy(false);
  };

  const toggleKind = (kind: "monster" | "spell" | "trap") => setFilter((f) => ({ ...f, [kind]: !f[kind] }));

  return (
    <div
      className="game-popup"
      onMouseMove={stopPropagationCallback}
      role="presentation"
      onClick={(e) => { stopPropagationCallback(e); close(); }}
    >
      <div
        className="game-popup-dialog ygo-menu-view-main-deck ygo-main-deck-popup ygo-deck-search"
        role="dialog"
        aria-label="Search your deck"
        onClick={stopPropagationCallback}
      >
        <div className="game-popup-header">
          <div className="game-popup-header-title">Search Deck{contents ? ` (${contents.size})` : ""}</div>
          <div>
            <button aria-label="Close" className="ygo-close" onClick={close}></button>
          </div>
        </div>
        <div className="game-popup-content-no-scroll ygo-flex ygo-gap-2 ygo-items-center ygo-pt-0">
          <div className="ygo-menu-view-main-deck-search-container">
            <input
              className="ygo-menu-view-main-deck-search"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search a Card..."
              aria-label="Search a card"
            />
          </div>
          {(["monster", "spell", "trap"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filter[kind]}
              aria-label={`${kind} cards`}
              className={`card-icon ygo-cursor-pointer ygo-${kind} ${filter[kind] ? "" : "not-selected"}`}
              onClick={() => toggleKind(kind)}
            />
          ))}
          <label className="ygo-deck-search-reveal">
            <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
            Reveal when adding to hand
          </label>
        </div>
        {error && <div className="ygo-deck-search-error" role="alert">{error}</div>}
        <div className="game-popup-content">
          {!contents && !error && <div className="ygo-deck-search-status" role="status">Looking through your deck…</div>}
          {contents && shown.length === 0 && <div className="ygo-deck-search-status" role="status">No cards match.</div>}
          <div className="ygo-menu-view-main-deck-cards">
            {shown.map((entry) => {
              const data = duel.ygo.state.getCardData(entry.id);
              const name = data?.name ?? entry.card?.name ?? `#${entry.id}`;
              const isSelected = selected === entry.id;
              return (
                <div key={entry.id} className={`ygo-deck-search-card ${isSelected ? "ygo-deck-search-card-selected" : ""}`}>
                  <button
                    type="button"
                    className="ygo-deck-search-card-button"
                    aria-pressed={isSelected}
                    aria-label={`${name}${entry.count > 1 ? `, ${entry.count} copies` : ""}`}
                    onClick={() => setSelected(isSelected ? null : entry.id)}
                  >
                    {data?.images?.small_url
                      ? <img alt="" src={data.images.small_url} className="ygo-card" />
                      : <span className="ygo-deck-search-card-name">{name}</span>}
                    {entry.count > 1 && <span className="ygo-deck-search-count">×{entry.count}</span>}
                  </button>
                  {isSelected && <div className="ygo-deck-search-actions">
                    {TARGETS.map((to) => (
                      <button key={to} type="button" className="ygo-card-item" disabled={busy} onClick={() => take(entry.id, to)}>
                        {DECK_TAKE_LABELS[to]}
                      </button>
                    ))}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
