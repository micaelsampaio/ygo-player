import { FormEvent, useCallback, useLayoutEffect, useRef, useState } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import * as THREE from "three";
import { parseTimeToSeconds } from "./parse-time";

export function TimerEventsActionsMenu({
  duel,
  transform,
}: {
  duel: YGODuel;
  transform: THREE.Mesh;
}) {
  const menuRef = useRef<HTMLDivElement>();

  const startTimer = useCallback(() => {
    duel.duelScene.timer.startTimer();
    duel.events.dispatch("clear-ui-action");
  }, []);

  const stopTimer = useCallback(() => {
    duel.duelScene.timer.stopTimer();
    duel.events.dispatch("clear-ui-action");
  }, []);

  const pauseTimer = useCallback(() => {
    duel.duelScene.timer.pauseTimer();
    duel.events.dispatch("clear-ui-action");
  }, []);

  // Inline field instead of a blocking prompt()/alert() (which also froze
  // the WebGL loop while open).
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownRaw, setCountdownRaw] = useState("");
  const [countdownError, setCountdownError] = useState("");

  const startCountDown = useCallback((e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const timeInSeconds = parseTimeToSeconds(countdownRaw);

    if (timeInSeconds === null) {
      setCountdownError("Use a time like 2m30s, 5m or 30s.");
      return;
    }
    duel.duelScene.timer.startCountDown(timeInSeconds);
    duel.events.dispatch("clear-ui-action");
  }, [countdownRaw]);

  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);

    const top = Math.max(0, y - size.height);
    const left = x - size.width / 2 + width / 2;

    const clampedTop = Math.min(top, window.innerHeight - size.height);
    const clampedLeft = Math.max(0, Math.min(left, window.innerWidth - size.width));

    container.style.top = clampedTop + "px";
    container.style.left = clampedLeft + "px";
  }, [transform, countdownOpen, countdownError]);

  return (
    <CardMenu key="global-events-actions-menu" menuRef={menuRef}>
      <button
        className="ygo-card-item"
        type="button"
        onClick={() => startTimer()}
      >
        Start Timer
      </button>

      <button
        className="ygo-card-item"
        type="button"
        onClick={() => stopTimer()}
      >
        Stop Timer
      </button>

      <button
        className="ygo-card-item"
        type="button"
        onClick={() => pauseTimer()}
      >
        Pause Timer
      </button>

      {!countdownOpen && <button
        className="ygo-card-item"
        type="button"
        onClick={() => setCountdownOpen(true)}
      >
        Start Countdown
      </button>}

      {countdownOpen && <form className="ygo-timer-countdown-form" onSubmit={startCountDown}>
        <div className="ygo-flex ygo-gap-1">
          <input
            className="ygo-input"
            type="text"
            autoFocus
            placeholder="e.g. 2m30s"
            aria-label="Countdown length"
            aria-invalid={!!countdownError}
            value={countdownRaw}
            onChange={e => { setCountdownRaw(e.target.value); setCountdownError(""); }}
          />
          <button className="ygo-card-item" type="submit" disabled={!countdownRaw.trim()}>
            Start
          </button>
        </div>
        {countdownError && <div className="ygo-timer-countdown-error" role="alert">{countdownError}</div>}
      </form>}

    </CardMenu>
  );
}
