import { useLayoutEffect, type DependencyList, type RefObject } from "react";
import type { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera } from "../../scripts/ygo-utils";
import { anchorCardMenu, hasPointerPosition, placeAboveRect, placeLeftOfRect, type AnchorRect, type MenuPosition } from "./pile-menu";

type OpeningEvent = { clientX?: unknown; clientY?: unknown; detail?: unknown } | null | undefined;

export type MenuAnchor =
  /** Centred above a 3D object on the board (below it with `below`). */
  | { kind: "object3d"; object: any; below?: boolean }
  /** To the left of a card element in a pile list. */
  | { kind: "left-of"; element: { getBoundingClientRect(): AnchorRect }; event?: OpeningEvent }
  /** At the pointer, or beside `element` when opened from the keyboard (see anchorCardMenu). */
  | { kind: "pointer"; element: { getBoundingClientRect(): AnchorRect } | null; event?: OpeningEvent };

/**
 * Positions a card menu (`menuRef`, measured after render) at its anchor,
 * kept inside the viewport, whenever `deps` change. `getAnchor` runs inside
 * the layout effect. A menu opened from the keyboard (an opening event with
 * no pointer position) gets focus on its first button, so its actions are
 * one Tab away.
 */
export function useAnchoredMenu(
  duel: YGODuel,
  menuRef: RefObject<HTMLDivElement | null | undefined>,
  getAnchor: () => MenuAnchor,
  deps: DependencyList,
) {
  useLayoutEffect(() => {
    const container = menuRef.current!;
    const { width, height } = container.getBoundingClientRect();
    const size = { width, height };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const anchor = getAnchor();

    let position: MenuPosition;
    if (anchor.kind === "object3d") {
      position = placeAboveRect(getTransformFromCamera(duel, anchor.object), size, viewport, { below: anchor.below });
    } else if (anchor.kind === "left-of") {
      position = placeLeftOfRect(anchor.element.getBoundingClientRect(), size, viewport);
    } else {
      position = anchorCardMenu(anchor.event, anchor.element, size, viewport);
    }

    container.style.top = position.top + "px";
    container.style.left = position.left + "px";

    const fromKeyboard = anchor.kind === "pointer"
      ? !hasPointerPosition(anchor.event)
      : anchor.kind === "left-of" && !!anchor.event && !hasPointerPosition(anchor.event);
    if (fromKeyboard) {
      container.querySelector<HTMLButtonElement>("button")?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
