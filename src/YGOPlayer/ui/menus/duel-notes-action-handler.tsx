import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, YGODuelEvents } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { stopPropagationCallback } from "../../scripts/utils";

export function DuelNotesActionEventHandler({
  event,
  onCompleted,
}: {
  duel: YGODuel;
  event: YGODuelEvents.Note;
  card: Card;
  onCompleted: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [progressEnabled, setProgressEnabled] = useState(true);
  const [progress, setNoteProgress] = useState(event.duration > 0 ? 100 : -1);
  const isCompleted = useRef(false);
  const elapsed = useRef(0);

  const complete = useCallback(() => {
    if (isCompleted.current) return;
    isCompleted.current = true;
    onCompleted();
    setProgressEnabled(false);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (event.duration <= 0) return;

    const duration = event.duration * 1000;
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const update = (timestamp: number) => {
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (progressEnabled) {
        elapsed.current += delta;
      }

      const newProgress = Math.floor(Math.max(0, 100 - (elapsed.current / duration) * 100));
      setNoteProgress(newProgress);

      console.log(elapsed.current < duration)
      if (elapsed.current < duration) {
        animationFrameId = requestAnimationFrame(update);
      } else {
        complete();
      }
    };

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [event, progressEnabled]);



  useEffect(() => {
    elapsed.current = 0;
  }, [event])

  const handleClose = () => {
    setVisible(false);

    setTimeout(() => {
      complete();
    }, 300);
  };

  return (
    <div
      className="ygo-duel-notes-dialog-container"
      onClick={(e) => e.stopPropagation()}
      onMouseMove={stopPropagationCallback}
      onMouseDown={stopPropagationCallback}
      onMouseUp={stopPropagationCallback}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <div
        className={`ygo-duel-notes-container ${visible ? "ygo-fade-in" : "ygo-fade-out"}`}
        onMouseEnter={() => !isCompleted.current && setProgressEnabled(false)}
        onMouseLeave={() => !isCompleted.current && setProgressEnabled(true)}
      >
        <div className="ygo-flex ygo-flex-col ygo-gap-md">
          {event.note.split("\n").map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>

        {progress >= 0 && <div>
          <div className="ygo-notes-progress-container">
            <div className="ygo-notes-progress-value" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        }

        <div className="ygo-text-center">
          <button
            className="ygo-btn ygo-btn-action"
            style={{ minWidth: "180px" }}
            onClick={handleClose}
          >
            Skip Note
          </button>
        </div>
      </div>
    </div>
  );
}
