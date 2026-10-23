import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { registerYGOWebComponents, type YGOPlayerComponent } from "../../../src/YGOPlayer/web";
import type { YGODuel } from "../../../src/YGOPlayer/core/YGODuel";
import "../../../src/YGOPlayer/style/style.css";
import { BATTLE_DEMO_STEPS, buildBattleDemoConfig, loadBattleDemoCards, type BattleDemoStep } from "./battle-demo-script";

registerYGOWebComponents();

const SPEEDS = [0.5, 1, 1.5, 2, 3];
/** Pause between two scripted steps at game speed 1. */
const BASE_GAP_MS = 2000;
/** Time the duel gets to settle (opening draw, camera) before the first step. */
const BASE_START_DELAY_MS = 2500;

interface DemoLogEntry {
  t: string;
  text: string;
  kind: "step" | "command" | "overlay" | "info";
}

declare global {
  interface Window {
    /** Read-only handle for tests / devtools: what the demo did and saw. */
    __battleDemo?: { log: DemoLogEntry[]; overlays: { damage: number; phase: number }; loops: number };
  }
}

function now() {
  return new Date().toLocaleTimeString(undefined, { hour12: false });
}

/**
 * /battle-demo — boots a duel from a prebuilt board (Main Phase 1, monsters on
 * both fields) and plays a scripted battle on a loop through the player's own
 * game actions (duel.gameActions.*), so the battle animations can be watched
 * without playing a duel.
 */
export default function BattleDemoPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YGOPlayerComponent | null>(null);
  const runIdRef = useRef(0);
  const speedRef = useRef(1);
  const loopRef = useRef(true);
  const originalSpeedRef = useRef<number | null>(null);
  const duelRef = useRef<YGODuel | null>(null);
  const startDuelRef = useRef<() => void>(() => {});

  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [loops, setLoops] = useState(0);
  const [log, setLog] = useState<DemoLogEntry[]>([]);
  const [overlays, setOverlays] = useState({ damage: 0, phase: 0 });

  const pushLog = useCallback((kind: DemoLogEntry["kind"], text: string) => {
    const entry = { t: now(), text, kind };
    const g = (window.__battleDemo ??= { log: [], overlays: { damage: 0, phase: 0 }, loops: 0 });
    g.log.push(entry);
    if (g.log.length > 500) g.log.shift();
    setLog((prev) => [entry, ...prev].slice(0, 60));
  }, []);

  const sleep = (ms: number, runId: number) =>
    new Promise<boolean>((resolve) => setTimeout(() => resolve(runIdRef.current === runId), ms));

  const runStep = (duel: YGODuel, step: BattleDemoStep) => {
    const actions = duel.gameActions;
    switch (step.kind) {
      case "phase":
        actions.setDuelPhase({ phase: step.phase as any });
        break;
      case "attack":
        actions.attack({
          attackingId: step.attackingId,
          attackingZone: step.attackingZone as any,
          attackedId: step.attackedId,
          attackedZone: step.attackedZone as any,
          battleDamage: step.battleDamage,
          destroyAttacked: step.destroyAttacked,
          destroyAttacking: step.destroyAttacking,
        });
        break;
      case "direct":
        actions.attackDirectly({ id: step.id, originZone: step.originZone as any });
        break;
    }
  };

  const playSequence = useCallback(async (duel: YGODuel, runId: number) => {
    const gap = () => BASE_GAP_MS / speedRef.current;
    if (!(await sleep(BASE_START_DELAY_MS / speedRef.current, runId))) return;

    for (let i = 0; i < BATTLE_DEMO_STEPS.length; i++) {
      if (runIdRef.current !== runId) return;
      const step = BATTLE_DEMO_STEPS[i];
      setCurrentStep(i);
      pushLog("step", `${i + 1}. ${step.label}`);
      try {
        runStep(duel, step);
      } catch (error) {
        pushLog("info", `step ${i + 1} threw: ${String(error)}`);
        console.error("[battle-demo] step failed", step, error);
      }
      if (!(await sleep(gap() + (step.extraWaitMs ?? 0) / speedRef.current, runId))) return;
    }

    setCurrentStep(-1);
    if (!loopRef.current) {
      pushLog("info", "sequence done");
      return;
    }
    if (!(await sleep(gap(), runId))) return;
    setLoops((n) => n + 1);
    if (window.__battleDemo) window.__battleDemo.loops++;
    startDuelRef.current();
  }, [pushLog]);

  /** (Re)boots the duel from the prebuilt board; the "start" listener plays the script. */
  const startDuel = useCallback(() => {
    const ygo = playerRef.current;
    if (!ygo) return;
    runIdRef.current++;
    setCurrentStep(-1);
    const runId = runIdRef.current;
    pushLog("info", "booting duel from prebuilt board");
    loadBattleDemoCards()
      .then(() => {
        if (runIdRef.current !== runId || playerRef.current !== ygo) return;
        ygo.editor(buildBattleDemoConfig(String(import.meta.env.VITE_YGO_CDN_URL)) as any);
      })
      .catch((error) => {
        pushLog("info", String(error));
        console.error("[battle-demo]", error);
      });
  }, [pushLog]);
  startDuelRef.current = startDuel;

  // Mount the <ygo-player> once, wire its events, boot the first duel.
  useEffect(() => {
    const host = hostRef.current!;
    const ygo = document.createElement("ygo-player") as YGOPlayerComponent;
    ygo.style.display = "block";
    ygo.style.width = "100%";
    ygo.style.height = "100%";
    host.appendChild(ygo);
    playerRef.current = ygo;

    ygo.on("start", ({ duel }) => {
      duelRef.current = duel;
      if (originalSpeedRef.current === null) originalSpeedRef.current = duel.settings.getGameSpeed();
      duel.settings.setGameSpeed(speedRef.current);
      playSequence(duel, runIdRef.current);
    });
    ygo.on("command-executed", ({ command }) => {
      pushLog("command", `cmd: ${command.type}`);
    });

    // Watch the DOM overlays the battle animations should produce.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          const check = (el: HTMLElement) => {
            if (el.classList.contains("ygo-damage-number")) {
              setOverlays((o) => ({ ...o, damage: o.damage + 1 }));
              if (window.__battleDemo) window.__battleDemo.overlays.damage++;
              pushLog("overlay", `damage number: ${el.textContent}`);
            } else if (el.classList.contains("ygo-phase-banner")) {
              setOverlays((o) => ({ ...o, phase: o.phase + 1 }));
              if (window.__battleDemo) window.__battleDemo.overlays.phase++;
              pushLog("overlay", `phase banner: ${el.textContent}`);
            }
          };
          check(node);
          node.querySelectorAll<HTMLElement>(".ygo-damage-number, .ygo-phase-banner").forEach(check);
        });
      }
    });
    observer.observe(host, { childList: true, subtree: true });

    window.__battleDemo = { log: [], overlays: { damage: 0, phase: 0 }, loops: 0 };
    startDuel();

    return () => {
      runIdRef.current++;
      observer.disconnect();
      // Don't leave the demo's speed in the user's saved player settings.
      if (duelRef.current && originalSpeedRef.current !== null) {
        duelRef.current.settings.setGameSpeed(originalSpeedRef.current);
      }
      ygo.remove();
      playerRef.current = null;
    };
  }, [startDuel, playSequence, pushLog]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    speedRef.current = value;
    duelRef.current?.settings.setGameSpeed(value);
  };

  const toggleLoop = (value: boolean) => {
    setLoop(value);
    loopRef.current = value;
  };

  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden", position: "fixed", inset: 0 }}>
      <div ref={hostRef} style={{ width: "100%", height: "100%" }} />

      <div className="battle-demo-panel" style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <strong style={{ fontSize: 14 }}>Battle demo</strong>
          <span style={{ flexGrow: 1 }} />
          <Link to="/" style={{ color: "#9cf", fontSize: 12 }}>back</Link>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <button style={btnStyle} onClick={startDuel} data-testid="battle-demo-replay">Replay sequence</button>
          <label style={{ fontSize: 12 }}>
            Speed{" "}
            <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} data-testid="battle-demo-speed">
              {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={loop} onChange={(e) => toggleLoop(e.target.checked)} /> loop
          </label>
        </div>

        <ol style={{ margin: "0 0 8px 18px", padding: 0, fontSize: 12 }}>
          {BATTLE_DEMO_STEPS.map((s, i) => (
            <li key={i} style={{ color: i === currentStep ? "#ffd54a" : "#ccc", fontWeight: i === currentStep ? 700 : 400 }}>
              {s.label}
            </li>
          ))}
        </ol>

        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
          loops: {loops} · damage numbers seen: <span data-testid="battle-demo-damage-count">{overlays.damage}</span> · phase banners seen:{" "}
          <span data-testid="battle-demo-phase-count">{overlays.phase}</span>
        </div>

        <div style={{ maxHeight: 160, overflowY: "auto", fontFamily: "monospace", fontSize: 10, lineHeight: 1.35 }}>
          {log.map((e, i) => (
            <div key={i} style={{ color: e.kind === "overlay" ? "#8f8" : e.kind === "step" ? "#ffd54a" : e.kind === "info" ? "#f99" : "#999" }}>
              {e.t} {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 8,
  left: 8,
  zIndex: 100000,
  width: 300,
  padding: 10,
  borderRadius: 8,
  background: "rgba(10, 12, 20, 0.85)",
  color: "#eee",
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "auto",
};

const btnStyle: React.CSSProperties = {
  background: "#3b6fd8",
  color: "white",
  border: 0,
  borderRadius: 4,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
};
