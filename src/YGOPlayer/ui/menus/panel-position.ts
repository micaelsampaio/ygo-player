/** Keep a dragged panel's stored top-left inside its container — a position
 * saved on a wide desktop window would otherwise land off-screen on a
 * phone, or after the window shrinks. At least `minVisibleHeight` px of the
 * panel (its drag header) stays reachable at the bottom edge. */
export function clampPanelPosition(
  pos: { x: number; y: number },
  panel: { width: number },
  container: { width: number; height: number },
  minVisibleHeight = 40,
): { x: number; y: number } {
  const maxX = Math.max(0, container.width - panel.width);
  const maxY = Math.max(0, container.height - minVisibleHeight);
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}
