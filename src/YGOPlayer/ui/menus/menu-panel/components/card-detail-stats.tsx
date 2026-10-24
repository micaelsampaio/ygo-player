import type { ReactNode } from "react";
import type { Card } from "ygo-core";
import { cardBattleStats, cardLevelInfo, cardPendulumScale } from "./card-detail-info";

/** Spell / Trap subtype shown next to the stats (from parseSelectedCard). */
export interface CardSubtypeInfo {
  isSpell: boolean;
  isTrap: boolean;
  cardTypeIcon: string;
  cardTypeName: string;
}

/**
 * The Master Duel-style stats block (Level / Rank / Link, ATK, DEF, Pendulum Scale, Spell / Trap
 * subtype), shared by the selected card panel and the card highlight dialog.
 */
export function CardDetailStats({
  card,
  subtype,
  className = "",
  children,
}: {
  card: Card;
  subtype: CardSubtypeInfo;
  className?: string;
  children?: ReactNode;
}) {
  const level = cardLevelInfo(card);
  const stats = cardBattleStats(card);
  const scale = cardPendulumScale(card);

  return (
    <div className={`ygo-md-card-stats ${className}`}>
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

      {(subtype.isSpell || subtype.isTrap) && <div className="ygo-md-stat ygo-md-stat-subtype">
        {subtype.cardTypeIcon && <span className="ygo-card-stats ygo-md-subtype-icon">
          <span className={`ygo-card-stats-icon ${subtype.cardTypeIcon}`} />
        </span>}
        <span>{subtype.cardTypeName}</span>
      </div>}

      {children}
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
