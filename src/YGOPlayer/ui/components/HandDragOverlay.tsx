import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { YGODuel } from "../../core/YGODuel";
import type { HandDragUiState } from "../../core/YGODuelUIEvents";
import { handDragAvailable } from "../../core/components/YGOHandDrag";
import { HIGHLIGHT_CSS, PICK_CSS } from "../../game/meshes/highlight-frame";
import { createAssistedHandDropProvider } from "../hand-drag-assisted";

/** Where the Set chip goes (px in the overlay): just left of your hand, a little above it. */
function chipAnchor(duel: YGODuel, overlay: DOMRect): { x: number; y: number } | null {
  const hand = duel.fields[duel.perspective.playerIndex]?.hand;
  const cards = hand?.cards ?? [];
  if (cards.length === 0) return null;
  const left = cards.reduce((min, c) => Math.min(min, c.position.x), Infinity);
  const world = new THREE.Vector3(left - 3.4, cards[0].position.y + 1.6, cards[0].position.z);
  const ndc = world.project(duel.core.camera);
  const canvas = duel.core.renderer.domElement.getBoundingClientRect();
  const x = canvas.left - overlay.left + ((ndc.x + 1) / 2) * canvas.width;
  const y = canvas.top - overlay.top + ((1 - ndc.y) / 2) * canvas.height;
  // On screen, with a 16px gutter.
  const margin = 16 + 36;
  return {
    x: Math.min(Math.max(x, margin), overlay.width - margin),
    y: Math.min(Math.max(y, margin), overlay.height - margin),
  };
}

/**
 * Drag and drop from the hand, Assisted Mode: installs what a drop means (the engine's moves,
 * ui/hand-drag-assisted.ts) and, while a card is dragged, shows the "Set" drop target.
 */
export function HandDragOverlay({ duel }: { duel: YGODuel }) {
  const available = handDragAvailable(duel);
  const [state, setState] = useState<HandDragUiState | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!available || !duel.handDrag) return;
    return duel.handDrag.setProvider(createAssistedHandDropProvider(duel));
  }, [duel, available]);

  useEffect(() => {
    const onState = (next: HandDragUiState | null) => setState(next);
    duel.events.on("hand-drag-state", onState);
    return () => duel.events.off("hand-drag-state", onState);
  }, [duel]);

  const showChip = !!state?.set;
  useLayoutEffect(() => {
    if (!showChip || !overlayRef.current) { setAnchor(null); return; }
    setAnchor(chipAnchor(duel, overlayRef.current.getBoundingClientRect()));
  }, [duel, showChip]);

  useLayoutEffect(() => {
    duel.handDrag?.setSetTargetElement(showChip && anchor ? chipRef.current : null);
    return () => duel.handDrag?.setSetTargetElement(null);
  }, [duel, showChip, anchor]);

  if (!available) return null;
  const active = !!state && (state.overSet || (state.shift && state.overZone));

  return (
    <div ref={overlayRef} aria-hidden={!state} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 105 }}>
      {state && (
        <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
          {state.overSet ? "Release to Set" : state.overZone ? (state.shift ? "Release to Set here" : "Release to play here") : "Drag onto a glowing zone"}
        </div>
      )}
      {showChip && anchor && (
        <div
          ref={chipRef}
          className="ygo-hand-drag-set"
          style={{
            position: "absolute", left: anchor.x, top: anchor.y, transform: "translate(-50%, -50%)",
            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", color: "#fff",
            background: active ? "rgba(52, 211, 153, 0.32)" : "rgba(15, 20, 30, 0.82)",
            border: `2px solid ${active ? PICK_CSS : HIGHLIGHT_CSS}`,
            boxShadow: active ? `0 0 16px ${PICK_CSS}` : "0 4px 14px rgba(0, 0, 0, 0.45)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 20, height: 14, borderRadius: 2, border: `2px solid ${HIGHLIGHT_CSS}`,
              background: `repeating-linear-gradient(45deg, ${HIGHLIGHT_CSS} 0 2px, transparent 2px 5px)`,
            }}
          />
          Set
        </div>
      )}
    </div>
  );
}
