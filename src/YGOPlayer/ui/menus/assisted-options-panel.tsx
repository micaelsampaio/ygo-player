import { useEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { YGOClientType } from "ygo-core";
import { YGOStatic } from "../../core/YGOStatic";
import { HIGHLIGHT_CSS } from "../../game/meshes/highlight-frame";
import { promptKey } from "../assist-zones";
import { assistErrorMessage, assistUnavailableReason } from "../duel-status";
import { useDuelTurnState } from "../use-duel-turn-state";
import { assistPanelTitle, mustStayOpen, opponentWaitingText } from "../assist-respond";
import { AnimationGate, createAnimationGate } from "./animation-gate";
import { GROUP_COLLAPSE_AT } from "./special-summon-groups";
import { canSummonFromExtraDeck } from "./extra-deck-highlight";
import { useChainStops, type ChainStops } from "./duel-preferences";
import { singlePromptAnswer } from "../assist-prompt";
import { AssistQueryResult, chainTopName, OptionRow, sectionsFor, spaceRow, TONE_TITLE } from "../assist-sections";
import { HighlightTarget, promptTargets, TONE_CSS, useCardHighlights, useExtraDeckHighlight } from "./assist-highlights";
import { usePanelPlacement } from "./use-panel-placement";
import { PromptView } from "./assist-prompt-view";

/** How long the panel waits after a choice for the moves it caused to start. */
const CHOICE_SETTLE_MS = 700;

const ERROR_VISIBLE_MS = 6000;
const NOTICE_VISIBLE_MS = 6000;

/**
 * Opt-in ("assisted mode") panel showing the human player the REAL legal
 * options ocgcore currently offers — the same data botDecision.ts already
 * drives the bot from — instead of only the free-form honor-system card
 * menus. The human's own chain windows ("Respond") and the effect prompts the
 * engine holds for them ("Your choice": which card, which Tribute, yes/no…)
 * are shown here too. Additive: when there's nothing to offer (not your
 * turn, a query in flight) it stays up with a one-line reason instead of
 * vanishing, and the existing card-hand/card-zone menus stay fully usable
 * as a fallback either way. Renders nothing if the room didn't enable
 * assisted mode.
 */
export function AssistedOptionsPanel({ duel, isMobileLayout = false }: { duel: YGODuel; isMobileLayout?: boolean }) {
  const [result, setResult] = useState<AssistQueryResult>({ available: false });
  // True until the first query answers, so the panel says "Checking…" instead of guessing a reason.
  const [loading, setLoading] = useState(true);
  // The row whose choice is in flight (spinner on it, every row disabled).
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // Long groups (a full Extra Deck) fold behind their title; the ones opened, by title.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const toggleGroup = (title: string) => setOpenGroups((prev) => {
    const next = new Set(prev);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });
  const [error, setError] = useState<string | null>(null);
  // Short-lived notice (e.g. a card-menu move the engine doesn't offer right now).
  const [notice, setNotice] = useState<string | null>(null);
  const [hover, setHover] = useState<HighlightTarget | null>(null);
  const requestIdRef = useRef(0);
  const turnState = useDuelTurnState(duel);

  const enabled = !!duel.assist && duel.client.type === YGOClientType.PLAYER && !!duel.ygo?.options?.assistedMode;
  const [chainStops, setChainStops, chainStopsHeld] = useChainStops(duel, enabled);

  // A new result waits for the running animation (the card being activated,
  // the bot's spotlight, the moves queued after it) to finish before it
  // shows — rows, frames and prompts alike. Until then `held` keeps the old
  // rows disabled and unframed. Released on the next enable-game-actions
  // (the queue drained), with a poll as the backstop.
  const [held, setHeld] = useState(false);
  const gateRef = useRef<AnimationGate<{ result: AssistQueryResult; options: AssistQueryResult | null }> | null>(null);
  // Right after a choice the server's answer can arrive before the moves it
  // caused (the bot's response, paced on the server): the board is still
  // for a moment, then animates. Hold the next options through that gap.
  const settleUntilRef = useRef(0);
  const holdAfterChoice = () => { settleUntilRef.current = Date.now() + CHOICE_SETTLE_MS; };
  if (!gateRef.current) {
    gateRef.current = createAnimationGate(() => !!duel.commands?.isBusy?.() || Date.now() < settleUntilRef.current, ({ result: next, options }) => {
      setResult(next);
      duel.assistOptions = options; // card menus route matching moves through the engine
      setHeld(false);
    });
  }
  const gate = gateRef.current;

  // Queries still on their way: until they answer, the rows on screen are stale.
  const inFlightRef = useRef(0);
  const refresh = () => {
    if (!enabled || !duel.assist) return;
    const requestId = ++requestIdRef.current;
    inFlightRef.current++;
    // Asked mid-animation (right after a choice): the rows on screen are about to be replaced.
    if (duel.commands?.isBusy?.()) setHeld(true);
    const offer = (value: { result: AssistQueryResult; options: AssistQueryResult | null }) => {
      if (!gate.offer(value)) setHeld(true);
    };
    duel.assist.query().then((res: AssistQueryResult) => {
      // Card data the server sent for the cards these options name (a Deck
      // card this client never saw), so names and art show.
      const cards = (res as { cards?: unknown[] } | null)?.cards;
      if (Array.isArray(cards) && cards.length) duel.ygo?.state?.registerCardData(cards as any);
      if (requestIdRef.current !== requestId) return; // superseded by a newer query
      // Card menus route through the engine with the newest options at once
      // (an offered card activated from its own menu is that response); only
      // what the panel draws waits for the animation.
      duel.assistOptions = res;
      // Pile viewers (the opened Extra Deck) frame the cards these options can play.
      duel.events.dispatch("assist-options", res);
      offer({ result: res, options: res });
    }).catch(() => {
      if (requestIdRef.current !== requestId) return;
      duel.assistOptions = null;
      duel.events.dispatch("assist-options", null);
      offer({ result: { available: false }, options: null });
    }).finally(() => {
      inFlightRef.current--;
      if (requestIdRef.current === requestId) setLoading(false);
    });
  };

  useEffect(() => {
    // Don't ask the server anything in a room that never enabled assisted mode.
    if (!enabled) return;
    refresh();
    // Every executed command toggles disable→enable around its animation;
    // clearing on "disable" would flicker the panel (and rebuild every
    // frame) on each one. The re-query on "enable" replaces the result
    // anyway, and a click on a now-stale row is safely rejected server-side.
    const onEnable = () => { gate.flush(); refresh(); };
    // A card's own menu can make an assisted move too (YGOGameActions.routeAssisted).
    const onMenuStart = (payload?: { code?: number }) => {
      setPendingKey("menu");
      setError(null);
      if (payload?.code !== undefined) forgetCarried(payload.code);
    };
    const onMenuDone = (payload?: { error?: unknown; notices?: string[] }) => {
      setPendingKey(null);
      holdAfterChoice();
      if (payload?.error) setError(assistErrorMessage(payload.error));
      if (payload?.notices?.length) setNotice(payload.notices.join(" · "));
      refresh();
    };
    const onNotice = (payload?: { message?: string }) => { if (payload?.message) setNotice(payload.message); };
    // An undo / redo moved the duel (in a bot duel the server rebuilt its
    // engine there): the options on screen belong to the old position.
    const onTimelineMoved = () => { setError(null); refresh(); };
    duel.events.on("assist-refresh", onTimelineMoved);
    duel.events.on("enable-game-actions", onEnable);
    duel.events.on("assist-choice-start", onMenuStart);
    duel.events.on("assist-choice-done", onMenuDone);
    duel.events.on("assist-notice", onNotice);
    return () => {
      duel.events.off("enable-game-actions", onEnable);
      duel.events.off("assist-choice-start", onMenuStart);
      duel.events.off("assist-choice-done", onMenuDone);
      duel.events.off("assist-notice", onNotice);
      duel.events.off("assist-refresh", onTimelineMoved);
      duel.assistOptions = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, enabled]);

  const lastPlayTargetsRef = useRef<{ turn?: number; phase?: string; targets: HighlightTarget[] } | null>(null);
  // The card just activated: its effect may be spent (once per turn), so it
  // doesn't keep a carried-over glow.
  const forgetCarried = (code: number) => {
    const carried = lastPlayTargetsRef.current;
    if (carried) carried.targets = carried.targets.filter((t) => t.code !== code);
  };

  // Space = the panel's Continue / Don't respond row (see YGODuel.assistSpaceAction).
  const spaceActionRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    if (!enabled) return;
    const action = () => spaceActionRef.current();
    duel.assistSpaceAction = action;
    return () => {
      if (duel.assistSpaceAction === action) duel.assistSpaceAction = null;
    };
  }, [duel, enabled]);

  // Backstop for a held result: an animation that ends without an
  // enable-game-actions (an undo, a replay jump) still releases it.
  useEffect(() => {
    if (!held) return;
    const timer = setInterval(() => {
      if (!gate.flush() && !gate.holding && !duel.commands?.isBusy?.() && inFlightRef.current === 0) setHeld(false);
    }, 250);
    return () => clearInterval(timer);
  }, [held, gate, duel]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const isActive = enabled && result.available;
  const sections = isActive ? sectionsFor(duel, result) : [];
  const prompt = isActive && result.pending === "prompt" ? result.prompt : null;
  const optionCount = sections.reduce((total, section) => total + section.rows.length, 0) + (prompt ? 1 : 0);
  const me = YGOStatic.playerIndex;
  const rowTargets: HighlightTarget[] = sections.flatMap((s) => s.rows)
    .filter((r) => r.highlight && r.code !== undefined)
    .map((r) => ({ code: r.code as number, side: me, tone: r.tone, loc: typeof r.data?.loc === "number" ? r.data.loc : undefined }));
  // Your own empty chain window (after a card resolved, a summon, a phase
  // change) lists only what can be chained. The cards you could play on your
  // open game state are still usable — the card menu continues past the
  // window first — so their amber glow stays, from this phase's last options.
  if (isActive && result.pending === "idle") {
    lastPlayTargetsRef.current = { turn: duel.ygo?.state?.turn, phase: duel.ygo?.state?.phase, targets: rowTargets };
  }
  const carried = lastPlayTargetsRef.current;
  const openWindow = isActive && result.pending === "chain" && result.respond.chainLength === 0 && turnState.isLocalTurn;
  const carriedTargets = openWindow && carried && carried.turn === duel.ygo?.state?.turn && carried.phase === duel.ygo?.state?.phase
    ? carried.targets.filter((t) => t.tone !== "quick" && !rowTargets.some((r) => r.code === t.code && r.side === t.side))
    : [];
  // Held for a running animation: the old rows stay up, disabled, with no frames.
  const highlightTargets: HighlightTarget[] = held ? [] : [...rowTargets, ...carriedTargets, ...promptTargets(prompt)];

  useCardHighlights(duel, highlightTargets, isActive && !held ? hover : null);
  useExtraDeckHighlight(duel, !held && isActive && result.pending === "idle" && canSummonFromExtraDeck(result.options));
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = usePanelPlacement(panelRef, isMobileLayout);

  if (!enabled) return null;

  const busy = pendingKey !== null || held;
  const activePending = isActive ? result.pending : null;
  const chainLength = isActive && result.pending === "chain" ? result.respond.chainLength : undefined;
  const respondingTo = isActive && result.pending === "chain" ? chainTopName(duel, result.respond.chain) : undefined;
  const decision = { pending: activePending, isLocalTurn: turnState.isLocalTurn, chainLength };
  // A held prompt is the one thing the engine is waiting on — keep it on
  // screen even when the panel is collapsed. So is a chain window during the
  // opponent's turn: in a bot duel its turn is paused until you answer.
  const collapsed = placement.collapsed && !mustStayOpen(decision);
  // The server says whether this is a bot duel (older servers: the duel's own option).
  const botDuel = !!(result as { botDuel?: boolean }).botDuel || !!(duel.ygo?.options as { botDuel?: unknown } | undefined)?.botDuel;
  const waitingText = opponentWaitingText({ ...decision, botDuel, respondingTo });
  const statusText = isActive
    ? (sections.length === 0 && !prompt ? "No options right now." : null)
    : assistUnavailableReason({
      loading,
      gameActive: duel.isGameActive,
      isLocalTurn: turnState.isLocalTurn,
      hasPriority: turnState.hasPriority,
    });

  const send = (key: string, commandType: string, data: any) => {
    if (busy || !duel.assist) return;
    if (commandType === "Activate" && typeof data?.id === "number") forgetCarried(data.id);
    setPendingKey(key);
    setError(null);
    setHover(null);
    duel.assist.choose({ commandType, data })
      .then((res: any) => {
        // e.g. "Bot activated Ash Blossom & Joyous Spring in response to your Bonfire"
        if (Array.isArray(res?.notices) && res.notices.length) setNotice(res.notices.join(" · "));
      })
      .catch((err: any) => {
        // Most commonly "stale options" — the real engine's state moved on
        // between query and click. Not fatal: refresh() below re-syncs.
        console.warn("AssistedOptionsPanel: choice rejected", err?.error ?? err);
        setError(assistErrorMessage(err));
      })
      .finally(() => {
        setPendingKey(null);
        holdAfterChoice();
        refresh();
      });
  };
  const choose = (row: OptionRow) => send(row.key, row.commandType, row.data);
  const spaceTarget = prompt ? null : spaceRow(sections);
  spaceActionRef.current = () => {
    // A focused button already answers Space itself.
    const focused = document.activeElement;
    if (focused instanceof HTMLButtonElement || focused instanceof HTMLSelectElement) return false;
    if (busy) return false;
    if (prompt) {
      // An effect's choice with exactly one answer (one card, one free zone).
      const answer = singlePromptAnswer(prompt);
      if (!answer) return false;
      respondPrompt("confirm", answer);
      return true;
    }
    const row = spaceRow(sections);
    if (!row) return false;
    choose(row);
    return true;
  };
  const respondPrompt = (key: string, data: any) => send(`prompt:${key}`, "Respond Prompt", data);
  const promptPendingKey = pendingKey?.startsWith("prompt:") ? pendingKey.slice("prompt:".length) : null;

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

  return (
    <div
      ref={panelRef}
      className="ygo-card-menu ygo-assisted-options-panel"
      style={{
        ...placement.style,
        width: isMobileLayout && collapsed ? "auto" : 230,
        maxWidth: "calc(100% - 24px)",
        gap: 6,
      }}
      role="presentation"
      onClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onMouseMove={stop}
      onWheel={stop}
    >
      <div
        onPointerDown={placement.onHeaderPointerDown}
        onDoubleClick={placement.resetPosition}
        title="Drag to move · double-click to dock back"
        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        <span style={{ opacity: 0.4, fontSize: 12, letterSpacing: "-2px" }}>⋮⋮</span>
        <span style={{ flexGrow: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, whiteSpace: "nowrap" }}>
          {assistPanelTitle(decision)}{collapsed && optionCount > 0 ? ` (${optionCount})` : ""}
        </span>
        <button
          onPointerDown={stop}
          onClick={placement.toggleCollapsed}
          aria-label={collapsed ? "Expand options" : "Collapse options"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand" : "Collapse"}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 2px", fontSize: 14, opacity: 0.7, lineHeight: 1 }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {statusText && (!collapsed || !isActive) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12, opacity: 0.75, lineHeight: 1.35,
            // Collapsed, it's a one-line chip; expanded, the full sentence.
            ...(collapsed ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 } : {}),
          }}
        >
          {statusText}
        </div>
      )}
      {waitingText && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            fontSize: 12, fontWeight: 600, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(255, 201, 60, 0.2)", borderLeft: `3px solid ${HIGHLIGHT_CSS}`,
          }}
        >
          {waitingText}
        </div>
      )}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(255, 201, 60, 0.14)", borderLeft: `3px solid ${HIGHLIGHT_CSS}`,
          }}
        >
          {notice}
        </div>
      )}
      {error && !collapsed && (
        <div
          role="alert"
          style={{
            fontSize: 12, lineHeight: 1.35, padding: "5px 8px", borderRadius: 4,
            background: "rgba(220, 38, 38, 0.18)", borderLeft: "3px solid rgb(239, 68, 68)", color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}
      {prompt && (
        <PromptView
          key={promptKey(prompt)}
          duel={duel}
          prompt={prompt}
          busy={busy}
          pendingKey={promptPendingKey}
          respond={respondPrompt}
          onHover={setHover}
        />
      )}
      {!collapsed && sections.map((section) => {
        const foldable = section.rows.length > GROUP_COLLAPSE_AT;
        const open = !foldable || openGroups.has(section.title);
        return (
        <div key={section.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            role={foldable ? "button" : undefined}
            tabIndex={foldable ? 0 : undefined}
            aria-expanded={foldable ? open : undefined}
            onClick={foldable ? () => toggleGroup(section.title) : undefined}
            onKeyDown={foldable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(section.title); } } : undefined}
            style={{ fontSize: 11, fontWeight: 600, opacity: 0.55, display: "flex", alignItems: "center", gap: 5, marginTop: 2, cursor: foldable ? "pointer" : undefined }}
          >
            {[...new Set(section.rows.filter((r) => r.highlight).map((r) => r.tone ?? "play"))].map((tone) => (
              <span key={tone} title={TONE_TITLE[tone]} style={{ width: 7, height: 7, borderRadius: "50%", background: TONE_CSS[tone], display: "inline-block" }} />
            ))}
            {section.title}
            {foldable && <span style={{ marginLeft: "auto", fontWeight: 500 }}>{open ? "▾" : `(${section.rows.length}) ▸`}</span>}
          </div>
          {open && section.rows.map((row) => (
            <button
              key={row.key}
              className="ygo-card-item"
              disabled={busy}
              aria-busy={pendingKey === row.key}
              onClick={() => choose(row)}
              onMouseEnter={() => setHover(row.code !== undefined ? { code: row.code, side: me, tone: row.tone, loc: typeof row.data?.loc === "number" ? row.data.loc : undefined } : null)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(row.code !== undefined ? { code: row.code, side: me, tone: row.tone, loc: typeof row.data?.loc === "number" ? row.data.loc : undefined } : null)}
              onBlur={() => setHover(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6, textAlign: "left", fontWeight: 600, fontSize: 13,
                ...(row.highlight ? { boxShadow: `inset 3px 0 0 ${TONE_CSS[row.tone ?? "play"]}` } : {}),
                // Keep the chosen row readable while the rest dim out.
                ...(pendingKey === row.key ? { opacity: 1 } : {}),
              }}
            >
              <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
              {pendingKey === row.key && <span className="ygo-inline-spinner" aria-hidden="true" />}
              {row.count > 1 && <span style={{ opacity: 0.6, fontSize: 11 }}>×{row.count}</span>}
              {row.where && <span style={{ opacity: 0.55, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.where}</span>}
              {row === spaceTarget && (
                <kbd title="Press Space" style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, opacity: 0.6, padding: "1px 5px", borderRadius: 3, border: "1px solid currentColor" }}>Space</kbd>
              )}
            </button>
          ))}
        </div>
        );
      })}
      {!collapsed && <ChainStopsControl value={chainStops} held={chainStopsHeld} onChange={setChainStops} />}
    </div>
  );
}

const CHAIN_STOP_CHOICES: ReadonlyArray<{ value: ChainStops; label: string; hint: string }> = [
  { value: "auto", label: "Auto", hint: "Pauses when you have a card you can chain." },
  { value: "always", label: "Always", hint: "Pauses at every chance to respond, even with nothing to chain, so your speed gives nothing away." },
  { value: "off", label: "Off", hint: "Never pauses unless a chain is forced. Faster, but your hand traps and set cards stay unused." },
];

/**
 * "Chain stops": which of your chain windows pause for you — Auto, Always or
 * Off, as in Master Duel. Holding OK shows here as Off (`held`), for as long as it lasts. A labelled segmented switch at the foot of the
 * panel, split from the options by a hairline, with a line on what the
 * current choice does.
 */
function ChainStopsControl({ value, held, onChange }: { value: ChainStops; held: boolean; onChange: (value: ChainStops) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = CHAIN_STOP_CHOICES.find((c) => c.value === value) ?? CHAIN_STOP_CHOICES[0];
  const pick = (i: number) => {
    const n = CHAIN_STOP_CHOICES.length;
    const index = (i + n) % n;
    onChange(CHAIN_STOP_CHOICES[index].value);
    refs.current[index]?.focus();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4, paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span id="ygo-chain-stops-label" style={{ fontSize: 12, fontWeight: 600 }}>Chain stops</span>
        <div
          role="radiogroup"
          aria-labelledby="ygo-chain-stops-label"
          aria-describedby="ygo-chain-stops-hint"
          style={{ display: "flex", padding: 2, borderRadius: 6, background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          {CHAIN_STOP_CHOICES.map((c, i) => {
            const active = c.value === value;
            return (
              <button
                key={c.value}
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(c.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); pick(i + 1); }
                  if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); pick(i - 1); }
                }}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 4, padding: "3px 8px",
                  fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                  color: active ? "#111" : "inherit",
                  background: active ? HIGHLIGHT_CSS : "transparent",
                  opacity: active ? 1 : 0.7,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div id="ygo-chain-stops-hint" style={{ fontSize: 11, lineHeight: 1.35, opacity: 0.6 }}>
        {held ? "Off while OK is held: ends at the next turn or your next move." : current.hint}
      </div>
    </div>
  );
}