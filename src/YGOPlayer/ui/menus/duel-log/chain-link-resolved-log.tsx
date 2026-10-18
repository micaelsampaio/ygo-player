import { memo } from "react";
import type { YGOCore, YGODuelEvents } from "ygo-core";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";
import { useDuelPerspective } from "../../duel-perspective";

/** "Chain Link N resolves: <card>" text for a ChainLinkResolved log (ResolveChainLinkCommand). */
export function chainLinkResolvedText(log: { link?: number }, cardName: string | undefined): string {
  const link = Number(log.link) || 0;
  return `Chain Link ${link} resolves${cardName ? `: ${cardName}` : ""}`;
}

/** One chain link resolved (newest first): chain mode in manual duels, or a parsed replay. */
export const ChainLinkResolvedLogRow = memo(function ChainLinkResolvedLogRow({
  log,
  ygo,
}: {
  log: YGODuelEvents.ChainLinkResolved;
  ygo?: InstanceType<typeof YGOCore>;
}) {
  const perspective = useDuelPerspective();
  const name = ygo?.state?.getCardData?.(log.id)?.name;
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div className="ygo-text-sm ygo-text-bold">
          <span className={`ygo-duel-log-chain-badge ygo-duel-log-chain-badge-inline ygo-player-${perspective.getPlayerCssIndex(log.player)}`} aria-hidden="true">{Number(log.link) || 0}</span>
          {chainLinkResolvedText(log, name)}
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
});
