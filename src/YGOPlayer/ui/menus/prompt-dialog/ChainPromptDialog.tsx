/**
 * The chain window as Master Duel asks it: 'The effect of "X" is activated.
 * Chain another card or effect?', the cards that can be chained as
 * thumbnails grouped by location, and Cancel (don't respond / continue) /
 * Effect Activation. A card is picked first (it glows), then activated;
 * clicking the picked card again, or double-clicking one, activates it at once.
 */
import { useState } from "react";
import type { YGODuel } from "../../../core/YGODuel";
import type { OptionRow } from "../../assist-sections";
import { chainQuestion, groupByLocation, PROMPT_KEYWORDS } from "./prompt-dialog";
import { CardThumbGroups, MdButton, MdFooter, MdPromptDialog, PromptQuestion, type ThumbView } from "./PromptDialog";

export function ChainPromptDialog({ duel, title, subtitle, rows, chainLength, respondingTo, busy, pendingKey, choose, onHover }: {
  duel: YGODuel;
  title: string;
  subtitle?: string | null;
  rows: OptionRow[];
  chainLength?: number;
  respondingTo?: string;
  busy: boolean;
  pendingKey: string | null;
  choose: (row: OptionRow) => void;
  onHover: (row: OptionRow | null) => void;
}) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const cards = rows.filter((r) => r.commandType !== "Pass");
  const passRow = rows.find((r) => r.commandType === "Pass");
  const others = rows.filter((r) => r.commandType !== "Pass" && r.code === undefined);
  const picked = cards.find((r) => r.key === pickedKey) ?? null;
  const question = chainQuestion({ title, chainLength, respondingTo });

  const thumbs: ThumbView[] = cards.filter((r) => r.code !== undefined).map((row) => ({
    key: row.key,
    code: row.code as number,
    name: row.label,
    imageUrl: duel.ygo?.state?.getCardData(row.code as number)?.images?.small_url,
    selected: row.key === pickedKey,
    busy: pendingKey === row.key,
    badge: row.count > 1 ? `×${row.count}` : undefined,
    onClick: () => (row.key === pickedKey ? choose(row) : setPickedKey(row.key)),
    onDoubleClick: () => choose(row),
    onHover: (on) => onHover(on ? row : null),
  }));
  const rowOf = new Map(cards.map((r) => [r.key, r]));
  const groups = groupByLocation(thumbs, (t) => {
    const loc = rowOf.get(t.key)?.data.loc;
    return { loc: typeof loc === "number" ? loc : undefined };
  });

  return (
    <MdPromptDialog label={question} className="ygo-assist-chain-dialog" resetKey={`${title}|${rows.map((r) => r.key).join(",")}`}>
      <PromptQuestion text={question} sub={subtitle} terms={[respondingTo ? `"${respondingTo}"` : null, ...PROMPT_KEYWORDS, ...cards.map((r) => r.label)]} />
      {groups.length > 0 && <CardThumbGroups groups={groups} disabled={busy} />}
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
            Cancel
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
