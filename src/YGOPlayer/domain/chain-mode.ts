/**
 * Chain mode (manual / editor duels): the player numbers the chain by hand.
 * Each manual Activate becomes the next chain link (ygo-core's
 * ActivateCardCommand `chainLink`), and the chain resolves one link at a time
 * (ResolveChainLinkCommand, newest first). Engine rooms (Assisted Mode, bot
 * duels) number the chain themselves, so chain mode is off there whatever
 * the setting says. Pure helpers: no React / three imports.
 */
import type { ChainLinkState } from "ygo-core";
import { YGOClientType } from "ygo-core";

/** The player setting (YGOPlayerSettings) that turns chain mode on. Default on. */
export const CHAIN_MODE_SETTING = "chainMode" as const;

/** A duel whose rules engine tracks the chain itself (Assisted Mode / bot duels). */
export function isEngineRoom(options: unknown): boolean {
  const o = options as { assistedMode?: unknown; botDuel?: unknown } | null | undefined;
  return !!o?.assistedMode || !!o?.botDuel;
}

/** What chain mode needs to know about a duel (a YGODuel satisfies it). */
export interface ChainModeDuel {
  ygo?: { options?: unknown; state?: { chain?: ChainLinkState[] } } | null;
  settings?: { getConfigFromPath(key: typeof CHAIN_MODE_SETTING): boolean | undefined } | null;
  config?: { gameMode?: string } | null;
  client?: { type?: YGOClientType } | null;
}

/**
 * Chain mode applies: not an engine room, not a replay being watched, not a
 * spectator, and the setting isn't switched off.
 */
export function chainModeOn(duel: ChainModeDuel | null | undefined): boolean {
  if (!duel || isEngineRoom(duel.ygo?.options)) return false;
  if (duel.config?.gameMode === "REPLAY" || duel.client?.type === YGOClientType.SPECTATOR) return false;
  return duel.settings?.getConfigFromPath(CHAIN_MODE_SETTING) !== false;
}

/** The chain as it stands (empty when there is none). */
export function currentChain(duel: ChainModeDuel | null | undefined): ChainLinkState[] {
  return duel?.ygo?.state?.chain ?? [];
}

/** The link number the next activation gets. */
export function nextChainLink(chain: ChainLinkState[] | undefined): number {
  return (chain?.length ?? 0) + 1;
}

/** The newest link (the one that resolves next), or null with no chain. */
export function newestChainLink(chain: ChainLinkState[] | undefined): number | null {
  if (!chain?.length) return null;
  return Math.max(...chain.map((l) => l.link));
}

/** Every link, in the order they resolve (newest first). */
export function chainResolveOrder(chain: ChainLinkState[] | undefined): number[] {
  return [...(chain ?? [])].map((l) => l.link).sort((a, b) => b - a);
}

/** The links, oldest first (the order "Negate link N" entries are listed in). */
export function chainLinkNumbers(chain: ChainLinkState[] | undefined): number[] {
  return [...(chain ?? [])].map((l) => l.link).sort((a, b) => a - b);
}

/** What a card menu shows for chain mode right now. */
export interface ChainMenuState {
  /** Chain mode applies and a chain is open. */
  open: boolean;
  /** The link the next activation becomes. */
  nextLink: number;
  /** The open links, oldest first (for "Negate link N"). */
  links: number[];
}

export function chainMenuState(duel: ChainModeDuel | null | undefined): ChainMenuState {
  const chain = chainModeOn(duel) ? currentChain(duel) : [];
  return { open: chain.length > 0, nextLink: nextChainLink(chain), links: chainLinkNumbers(chain) };
}

/**
 * An Activate entry's label: "Activate" becomes "Chain (link N)" while a chain
 * is open ("Activate from Hand" → "Chain from Hand (link N)").
 */
export function activateLabel(base: string, state: ChainMenuState): string {
  if (!state.open) return base;
  const chained = base.replace(/^Activate/, "Chain");
  return `${chained === base ? `Chain` : chained} (link ${state.nextLink})`;
}

/** The menu entry that resolves the open chain first and starts a new one. */
export const ACTIVATE_NEW_CHAIN_LABEL = "Activate as new chain";

/** "Negate link N" */
export function negateLinkLabel(link: number): string {
  return `Negate link ${link}`;
}

/** "Resolve link N" (the newest link), or just "Resolve" when it is the only link. */
export function resolveLinkLabel(chain: ChainLinkState[] | undefined): string {
  if ((chain?.length ?? 0) === 1) return "Resolve";
  const link = newestChainLink(chain);
  return link === null ? "Resolve link" : `Resolve link ${link}`;
}

/** "Resolve all" only adds something once the chain has two or more links. */
export function showResolveAll(chain: ChainLinkState[] | undefined): boolean {
  return (chain?.length ?? 0) > 1;
}

export const RESOLVE_ALL_LABEL = "Resolve all";
