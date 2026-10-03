import { useLayoutEffect, useRef, useState } from "react";
import { clampPanelPosition } from "./panel-position";
import { safeGetItem, safeSetItem } from "../../scripts/safe-storage";

const PLACEMENT_KEY = "ygo-assisted-panel";

interface Placement { x: number | null; y: number | null; collapsed: boolean }

function loadPlacement(): Placement {
  try {
    const raw = safeGetItem(PLACEMENT_KEY);
    if (raw) return { x: null, y: null, collapsed: false, ...JSON.parse(raw) };
  } catch { /* unreadable value — fall back to the docked default */ }
  return { x: null, y: null, collapsed: false };
}

function savePlacement(p: Placement) {
  safeSetItem(PLACEMENT_KEY, JSON.stringify(p));
}

/** Drag-by-header + collapse, remembered per browser, so the panel can be
 * moved off whatever it's covering (duel log, controls, a card). Until
 * the user drags it, it stays docked on the right between the HUDs. On
 * the mobile layout it starts collapsed every duel (whatever was stored),
 * since expanded it would cover a large part of the board. */
export function usePanelPlacement(panelRef: { current: HTMLDivElement | null }, isMobileLayout: boolean) {
  const [placement, setPlacement] = useState<Placement>(loadPlacement);
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const placementRef = useRef(placement);
  placementRef.current = placement;

  const update = (next: Placement) => { setPlacement(next); savePlacement(next); };

  // A stored position from a wider window can sit off-screen — pull it back
  // in on mount and whenever the window resizes. Not persisted: widening the
  // window again should restore the user's original spot.
  useLayoutEffect(() => {
    const clamp = () => {
      const panel = panelRef.current;
      const parent = panel?.offsetParent as HTMLElement | null;
      const { x, y } = placementRef.current;
      if (!panel || !parent || x === null || y === null) return;
      const next = clampPanelPosition({ x, y }, panel.getBoundingClientRect(), parent.getBoundingClientRect());
      if (next.x !== x || next.y !== y) setPlacement({ ...placementRef.current, ...next });
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [panelRef, isMobileLayout]);

  const onHeaderPointerDown = (e: { clientX: number; clientY: number; button: number; preventDefault(): void; stopPropagation(): void }) => {
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const panelRect = panel.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const grabX = e.clientX - panelRect.left;
    const grabY = e.clientY - panelRect.top;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      moved = true;
      const { x, y } = clampPanelPosition(
        { x: ev.clientX - parentRect.left - grabX, y: ev.clientY - parentRect.top - grabY },
        panelRect,
        parentRect,
      );
      setPlacement({ ...placementRef.current, x, y });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) savePlacement(placementRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const docked = placement.x === null || placement.y === null;
  const style: Record<string, any> = docked
    ? isMobileLayout
      // Below the (scaled-down) opponent HUD, kept narrow so the board stays visible.
      ? { top: 90, left: "auto", right: 12, maxHeight: "45%" }
      // Docked on the right between the two player HUDs (opponent: top 20px, you: bottom 100px).
      : { top: 130, left: "auto", right: 20, maxHeight: "calc(100% - 340px)" }
    : { top: placement.y, left: placement.x, right: "auto", maxHeight: isMobileLayout ? "45%" : `calc(100% - ${placement.y! + 20}px)` };

  const collapsed = isMobileLayout ? mobileCollapsed : placement.collapsed;

  return {
    style,
    collapsed,
    toggleCollapsed: () => {
      if (isMobileLayout) setMobileCollapsed((value) => !value);
      else update({ ...placementRef.current, collapsed: !placementRef.current.collapsed });
    },
    resetPosition: () => update({ ...placementRef.current, x: null, y: null }),
    onHeaderPointerDown,
  };
}
