import { memo } from "react";
import { DuelLogContainer, DuelLogRow } from "./duel-log-components";

/** The chain finished resolving (server duels: the rules engine says so). */
export const ChainResolvedLogRow = memo(function ChainResolvedLogRow({ log }: { log: any }) {
  const links = Number(log.links) || 0;
  return (
    <DuelLogRow log={log}>
      <DuelLogContainer>
        <div className="ygo-text-sm ygo-text-bold">
          Chain resolved{links > 1 ? ` (${links} links)` : ""}
        </div>
      </DuelLogContainer>
    </DuelLogRow>
  );
});
