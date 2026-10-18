import { Command, YGOCommandScope } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { DefaultTimelineCommand } from "./timeline/commands/default-command";
import { removeFocusFromActiveElement, stopPropagationCallback } from "../../scripts/utils";
import { memo, useCallback, useRef, useSyncExternalStore } from "react";
import { getCommandClass, subscribeTimeline, timelineSnapshot } from "./timeline/timeline-state";

export type { TimelineCommandProps } from "./timeline/types";

/**
 * The replay/duel timeline. It re-renders only when the current command or
 * the command list changes, and each row is memoised, so a step re-renders
 * just the rows whose class changed (the old and the new current command).
 */
export const TimeLine = memo(function TimeLine({ duel }: { duel: YGODuel }) {
  const mouseEnterTime = useRef(Date.now());
  const subscribe = useCallback((onChange: () => void) => subscribeTimeline(duel, onChange), [duel]);
  const snapshot = () => timelineSnapshot(duel);
  useSyncExternalStore(subscribe, snapshot, snapshot);

  const onCommandClick = useCallback((command: Command) => {
    if (Date.now() <= mouseEnterTime.current) return;
    setTimeout(() => {
      removeFocusFromActiveElement();
    });
    duel.serverActions.controls.goToCommand(command)
  }, [duel]);

  if (!duel.ygo) return null;
  const commands = duel.ygo.commands;
  const currentCommand = commands.index;

  return (
    <div
      className="timeline"
      onMouseEnter={() => mouseEnterTime.current = Date.now() + 500}
      onMouseMove={stopPropagationCallback}
      role="presentation"
      onClick={stopPropagationCallback}
    >
      {commands.map((command, index) => {
        if (command.scope !== YGOCommandScope.GAME) return null;

        return (
          <DefaultTimelineCommand
            key={index}
            duel={duel}
            command={command}
            index={index}
            commandClass={getCommandClass(index, currentCommand)}
            onCommandClick={onCommandClick}
          />
        );
      })}
    </div>
  );
});
