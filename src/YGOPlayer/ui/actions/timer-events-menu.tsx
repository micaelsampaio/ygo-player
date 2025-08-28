import { useCallback, useLayoutEffect, useRef } from "react";
import { YGODuel } from "../../core/YGODuel";
import { getTransformFromCamera, } from "../../scripts/ygo-utils";
import { CardMenu } from "../components/CardMenu";
import * as THREE from "three";

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

  const startCountDown = useCallback(() => {
    const timeRaw = prompt("Enter time (e.g. 2m30s, 5m, 30s)");

    if (!timeRaw) return;

    const timeInSeconds = parseTimeToSeconds(timeRaw);

    if (timeInSeconds === null || timeInSeconds <= 0) {
      alert("Invalid time format. Please enter something like '2m30s', '5m', or '30s'.");
      return;
    }
    duel.duelScene.timer.startCountDown(timeInSeconds);
    duel.events.dispatch("clear-ui-action");
  }, []);


  useLayoutEffect(() => {
    const container = menuRef.current!;
    const size = container.getBoundingClientRect();
    const { x, y, width } = getTransformFromCamera(duel, transform);
    container.style.top = Math.max(0, y - size.height) + "px";
    container.style.left = x - size.width / 2 + width / 2 + "px";
  }, [transform]);

  return (
    <CardMenu key="global-events-actions-menu" indicator menuRef={menuRef}>
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

      <button
        className="ygo-card-item"
        type="button"
        onClick={() => startCountDown()}
      >
        Start CountDown
      </button>

    </CardMenu>
  );
}
function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const regex = /^(?:(\d+)m)?\s*(?:(\d+)s)?$/i;
  const match = trimmed.match(regex);

  if (!match) return null;

  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = match[2] ? parseInt(match[2], 10) : 0;

  if (minutes === 0 && seconds === 0) return null;

  return minutes * 60 + seconds;
}
