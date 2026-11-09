/**
 * The chain window as Master Duel asks it: 'The effect of "X" is activated.
 * Chain another card or effect?', the cards that can be chained as
 * thumbnails grouped by location, and Cancel (don't respond / continue) /
 * Effect Activation. A card is picked first (it glows), then activated;
 * clicking the picked card again, or double-clicking one, activates it at once.
 * With a single card to chain it starts picked: Effect Activation is one click.
 */
import { useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import type { OptionRow } from "../../assist-sections";
import { isShareTag, SHARE_SOURCE } from "../../../domain/coach";
import { chainQuestion, groupByLocation, openWindowContext, PROMPT_KEYWORDS } from "./prompt-dialog";
import { CardThumbGroups, MdButton, MdFooter, MdPromptDialog, PromptQuestion, type ThumbView } from "./PromptDialog";

/** The Duel Coach in the dialog: its tags per card, and a note on the card being answered. */
export interface ChainDialogCoach {
  tagsFor(row: OptionRow): string[];
  keyNote: string | null;
  /** The newest chain link is the opponent's: say so when there's nothing to quote. */
  answering: boolean;
}

export function ChainPromptDialog({ duel, title, subtitle, rows, chainLength, respondingTo, openWindow, busy, pendingKey, choose, onHover, coach, isTrigger }: {
  duel: YGODuel;
  title: string;
  subtitle?: string | null;
  /** An open window (nothing to respond to, the bot's turn paused for you): a question to activate, and Continue. */
  openWindow?: boolean;
  rows: OptionRow[];
  chainLength?: number;
  respondingTo?: string;
  busy: boolean;
  pendingKey: string | null;
  choose: (row: OptionRow) => void;
  onHover: (row: OptionRow | null) => void;
  coach?: ChainDialogCoach;
  /** An optional trigger ("If …: You can"): shown apart, since triggers go on the chain first. */
  isTrigger?: (row: OptionRow) => boolean;
}) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const cards = rows.filter((r) => r.commandType !== "Pass");
  const passRow = rows.find((r) => r.commandType === "Pass");
  const others = rows.filter((r) => r.commandType !== "Pass" && r.code === undefined);
  const picked = cards.find((r) => r.key === pickedKey) ?? (cards.length === 1 ? cards[0] : null);
  // An open window says what just happened, like a response's question does ('"Rahu Dracotail"
  // resolved. Activate a card?'); a phase change keeps its own ("End of Main Phase: activate a card?").
  // "Activate now" (nothing on the chain, no phase moment) is a question too, an open window's or not.
  const plainActivate = title === "Activate now";
  const context = plainActivate
    ? openWindowContext((duel.ygo?.duelLog?.logs ?? []) as ReadonlyArray<{ type?: string; id?: number; chainLink?: number }>, (id) => duel.ygo.state.getCardData(id)?.name)
    : null;
  const question = plainActivate
    ? (context ? `${context.text}. Activate a card?` : "Activate a card now?")
    : chainQuestion({ title, chainLength, respondingTo });

  const thumbs: ThumbView[] = cards.filter((r) => r.code !== undefined).map((row) => ({
    key: row.key,
    code: row.code as number,
    name: row.label,
    imageUrl: duel.ygo?.state?.getCardData(row.code as number)?.images?.small_url,
    selected: row.key === picked?.key,
    busy: pendingKey === row.key,
    badge: row.count > 1 ? `×${row.count}` : undefined,
    onClick: () => (row.key === picked?.key ? choose(row) : setPickedKey(row.key)),
    onDoubleClick: () => choose(row),
    onHover: (on) => onHover(on ? row : null),
  }));
  const rowOf = new Map(cards.map((r) => [r.key, r]));
  const byLocation = (list: ThumbView[]) => groupByLocation(list, (t) => {
    const loc = rowOf.get(t.key)?.data.loc;
    return { loc: typeof loc === "number" ? loc : undefined };
  });
  const groups = byLocation(thumbs);
  // Triggers and Quick Effects together: shown apart. Triggers go on the chain first; once a
  // Quick Effect is chained, a trigger may not be offered again.
  const triggerThumbs = isTrigger ? thumbs.filter((t) => { const r = rowOf.get(t.key); return !!r && isTrigger(r); }) : [];
  const split = triggerThumbs.length > 0 && triggerThumbs.length < thumbs.length;
  const quickThumbs = split ? thumbs.filter((t) => !triggerThumbs.includes(t)) : [];

  return (
    <MdPromptDialog label={question} className="ygo-assist-chain-dialog" resetKey={`${title}|${rows.map((r) => r.key).join(",")}`}>
      <PromptQuestion text={question} sub={subtitle} terms={[respondingTo ? `"${respondingTo}"` : null, context ? `"${context.name}"` : null, ...PROMPT_KEYWORDS, ...cards.map((r) => r.label)]} />
      {split ? (
        <div className="ygo-md-chain-kinds">
          <section aria-label="Trigger effects">
            <div className="ygo-md-chain-kind-title">Trigger effects</div>
            <CardThumbGroups groups={byLocation(triggerThumbs)} disabled={busy} />
          </section>
          <section aria-label="Quick effects">
            <div className="ygo-md-chain-kind-title">Quick effects</div>
            <CardThumbGroups groups={byLocation(quickThumbs)} disabled={busy} />
          </section>
          <div className="ygo-md-chain-kind-note">Triggers go on the chain first: chain a Quick Effect now and the triggers may not be offered again.</div>
        </div>
      ) : groups.length > 0 && <CardThumbGroups groups={groups} disabled={busy} />}
      {coach && <CoachDialogTips coach={coach} rows={cards} respondingTo={respondingTo} />}
      {others.length > 0 && (
        <div className="ygo-md-prompt-options">
          {others.map((row) => (
            <MdButton key={row.key} variant="secondary" className="ygo-md-prompt-option" disabled={busy} busy={pendingKey === row.key} onClick={() => choose(row)}>
              {row.label}
            </MdButton>
          ))}
        </div>
      )}
      <MdFooter>
        {passRow && (
          <MdButton variant="secondary" disabled={busy} busy={pendingKey === passRow.key} onClick={() => choose(passRow)} title={passRow.label}>
            {openWindow ? "Continue" : "Cancel"}
            <kbd className="ygo-md-prompt-kbd" title="Press Space">Space</kbd>
          </MdButton>
        )}
        <MdButton variant="primary" disabled={busy || !picked} busy={!!picked && pendingKey === picked.key} onClick={() => picked && choose(picked)}>
          Effect Activation
        </MdButton>
      </MdFooter>
    </MdPromptDialog>
  );
}

/** The coach's read of each card you can chain here (replay stats, the engine's denial count). */
export function CoachDialogTips({ coach, rows, respondingTo }: { coach: ChainDialogCoach; rows: OptionRow[]; respondingTo?: string }) {
  const tips = rows.map((row) => ({ row, tags: coach.tagsFor(row) })).filter((t) => t.tags.length > 0);
  if (!tips.length && !coach.keyNote && !coach.answering) return null;
  return (
    <div className="ygo-md-coach-tips" role="note" aria-label="Coach">
      <div className="ygo-md-coach-tips-title">Coach</div>
      {coach.keyNote && <div>{coach.keyNote}</div>}
      {tips.map(({ row, tags }) => (
        <div key={row.key}><strong>{row.label}</strong>: {tags.join(" · ")}</div>
      ))}
      {tips.some(({ tags }) => tags.some(isShareTag)) && <div className="ygo-md-coach-tips-source">{SHARE_SOURCE}</div>}
      {!tips.length && !coach.keyNote && (
        <div className="ygo-md-coach-tips-empty">No replay stats{respondingTo ? ` for answering ${respondingTo}` : ""} yet.</div>
      )}
    </div>
  );
}
