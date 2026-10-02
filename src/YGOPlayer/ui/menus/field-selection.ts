import { useEffect, useRef, useState } from "react";
import { YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";
import type { ActionCardSelection } from "../../actions/ActionSelectCard";
import type { CardZone } from "../../game/CardZone";
import { getGameZone } from "../../scripts/ygo-utils";

export interface FieldSelectionItem<T> {
  /** The ygo zone ("M-2", "S2-1"…) to glow / click. */
  zone: string;
  /** What a click on that zone answers. */
  value: T;
}

export interface FieldSelectionOptions<T> {
  /** "zone": any zone; "card": only zones that hold a card. */
  selectionType: "zone" | "card";
  onPick: (value: T) => void;
  /** Called when the player dismisses the glow (Esc / click away); omit to let it come back on the next enable-game-actions. */
  onDismiss?: () => void;
}

/**
 * Glows `items` on the field through ActionCardSelection and answers a click
 * with its value. Animations briefly clear the field action
 * (disable-game-actions), so the glow is put back on the next
 * enable-game-actions. Returns the cleanup: it takes the glow down when it
 * is still showing. Does nothing (returns a no-op) when the duel has no card
 * selection.
 */
export function startFieldSelection<T>(duel: YGODuel, items: FieldSelectionItem<T>[], opts: FieldSelectionOptions<T>): () => void {
  const selection = duel.gameController?.getComponent<ActionCardSelection>("action_card_selection");
  if (!selection) return () => {};
  let id = -1;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const start = () => {
    if (disposed || (id !== -1 && selection.isSelecting(id))) return;
    const byZone = new Map<CardZone, T>();
    for (const item of items) {
      const cardZone = getGameZone(duel, YGOGameUtils.getZoneData(item.zone as any));
      if (cardZone && (opts.selectionType === "zone" || cardZone.getCardReference())) byZone.set(cardZone, item.value);
    }
    if (byZone.size === 0) return;
    const onDismiss = opts.onDismiss;
    id = selection.startSelection({
      zones: [...byZone.keys()],
      selectionType: opts.selectionType,
      onSelectionCompleted: (cardZone: CardZone) => {
        if (!byZone.has(cardZone) || disposed) return;
        opts.onPick(byZone.get(cardZone) as T);
      },
      onCanceled: onDismiss ? () => { if (!disposed) onDismiss(); } : undefined,
    });
  };

  start();
  const onEnable = () => { clearTimeout(timer); timer = setTimeout(start, 0); };
  duel.events.on("enable-game-actions", onEnable);
  return () => {
    disposed = true;
    clearTimeout(timer);
    duel.events.off("enable-game-actions", onEnable);
    // Still showing (the prompt went away, or the panel is answering it): take it down.
    if (id !== -1 && selection.isSelecting(id)) duel.actionManager.clearAction();
  };
}

/**
 * startFieldSelection for as long as `enabled` and the items (by `itemsKey`,
 * their identity — items are rebuilt every render) stay the same. With
 * `dismissible`, a dismissed glow stays off until `showAgain()`.
 */
export function useFieldSelection<T>(
  duel: YGODuel,
  items: FieldSelectionItem<T>[],
  itemsKey: string,
  { selectionType, enabled, onPick, dismissible = false }: {
    selectionType: "zone" | "card";
    enabled: boolean;
    onPick: (value: T) => void;
    dismissible?: boolean;
  },
) {
  const [dismissed, setDismissed] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!enabled || dismissed || items.length === 0) return;
    return startFieldSelection(duel, items, {
      selectionType,
      onPick: (value) => onPickRef.current(value),
      onDismiss: dismissible ? () => setDismissed(true) : undefined,
    });
    // `items` is rebuilt every render; itemsKey is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel, itemsKey, enabled, dismissed]);

  return { dismissed, showAgain: () => setDismissed(false) };
}
