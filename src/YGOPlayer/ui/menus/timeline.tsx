import { Command, YGOCommandScope } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { DefaultTimelineCommand } from "./timeline/commands/default-command";
import { removeFocusFromActiveElement, stopPropagationCallback } from "../../scripts/utils";
import { useRef } from "react";

export interface TimelineCommandProps {
  duel: YGODuel
  command: Command
  index: number
  commandClass: string
  onCommandClick: (command: Command) => void
}

export function TimeLine({ duel }: { duel: YGODuel }) {
  if (!duel.ygo) return null;
  const mouseEnterTime = useRef(Date.now());
  const commands = duel.ygo.commands;
  const currentCommand = duel.ygo.commands.index;

  const onCommandClick = (command: Command) => {
    if (Date.now() <= mouseEnterTime.current) return;
    setTimeout(() => {
      removeFocusFromActiveElement();
    });
    duel.serverActions.controls.goToCommand(command)
  };

  return (
    <div
      className="timeline"
      onMouseEnter={() => mouseEnterTime.current = Date.now() + 500}
      onMouseMove={stopPropagationCallback}
      onClick={stopPropagationCallback}
    >
      {commands.map((command: any, index: any) => {
        if (command.scope !== YGOCommandScope.GAME) return null;

        const commandClass = getCommandClass(index, currentCommand);
        const Command = DefaultTimelineCommand;
        return (
          <Command
            key={index}
            duel={duel}
            command={command}
            index={index}
            commandClass={commandClass}
            onCommandClick={onCommandClick}
          />
        );
      })}
    </div>
  );
}

export function getCommandClass(index: number, currentCommand: number) {
  if (index === currentCommand) return "current";
  if (index < currentCommand) return "prev";
  return "next";
}