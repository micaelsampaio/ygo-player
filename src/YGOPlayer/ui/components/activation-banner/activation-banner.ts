/**
 * Master Duel-style "Opponent activated" banner: the pure rules (which
 * activations get one, its text, the queue). No React / three imports, so
 * it stays unit-testable.
 */
import { HIDDEN_CARD_ID } from "ygo-core";
import type { CardActivatedEvent } from "../../../domain/card-activated";

export type { CardActivatedEvent };

export type ActivationKind = "spell" | "trap" | "effect";

export interface ActivationBannerContent {
  kind: ActivationKind;
  label: string;
  name: string;
  chainLink?: number;
}

export interface ActivationBannerItem extends ActivationBannerContent {
  id: number;
}

/** How long a banner stays up at 1x speed (its CSS animation is the same length). */
export const ACTIVATION_BANNER_MS = 1600;
/** Most banners stacked at once: an older one leaves early when a newer one comes. */
export const MAX_ACTIVATION_BANNERS = 3;

export function activationKind(frameType: string | undefined): ActivationKind {
  if (frameType?.startsWith("spell")) return "spell";
  if (frameType?.startsWith("trap")) return "trap";
  return "effect";
}

/** "Opponent activated a Trap" / "... a Spell" / "... an effect". */
export function activationLabel(kind: ActivationKind): string {
  if (kind === "spell") return "Opponent activated a Spell";
  if (kind === "trap") return "Opponent activated a Trap";
  return "Opponent activated an effect";
}

/** A card the viewer can't see (hidden-info duels send id 0) or without data: never named. */
export function isHiddenActivation(event: Pick<CardActivatedEvent, "cardId" | "name">): boolean {
  return !event.cardId || event.cardId === HIDDEN_CARD_ID || !event.name?.trim();
}

/**
 * The banner an activation gets, or null: only the opponent's (the side that
 * isn't the perspective player's), not while the board is recovering
 * (replay scrubbing, undo), not with the setting off, never for a hidden card.
 */
export function activationBanner(
  event: CardActivatedEvent,
  { isOpponent, enabled, recovering }: { isOpponent: boolean; enabled: boolean; recovering: boolean },
): ActivationBannerContent | null {
  if (!enabled || recovering || !isOpponent || isHiddenActivation(event)) return null;
  const kind = activationKind(event.frameType);
  return {
    kind,
    label: activationLabel(kind),
    name: event.name!.trim(),
    chainLink: event.chainLink && event.chainLink > 0 ? event.chainLink : undefined,
  };
}

/** The name line: "Ash Blossom & Joyous Spring · CL 2". */
export function activationTitle(banner: Pick<ActivationBannerContent, "name" | "chainLink">): string {
  return banner.chainLink ? `${banner.name} · CL ${banner.chainLink}` : banner.name;
}

/** Newest first, at most `max`. */
export function pushActivationBanner<T>(list: T[], banner: T, max = MAX_ACTIVATION_BANNERS): T[] {
  return [banner, ...list].slice(0, max);
}

/** A faster game speed shortens the banner too (never longer than at 1x). */
export function activationBannerMs(timeScale: number | undefined): number {
  const scale = typeof timeScale === "number" && timeScale > 1 ? timeScale : 1;
  return Math.round(ACTIVATION_BANNER_MS / scale);
}
