import { Command } from "ygo-core";
import { YGODuel } from "../../core/YGODuel";
import { cancelMouseEventsCallback } from "../../scripts/ygo-utils";
import { DefaultTimelineCommand } from "./timeline/commands/default-command";

export interface TimelineCommandProps {
  duel: YGODuel
  command: Command
  index: number
  commandClass: string
  onCommandClick: (command: Command) => void
}

export function TimeLine({ duel }: { duel: YGODuel }) {
  if (!duel.ygo) return null;

  const commands = duel.ygo.commands;
  const currentCommand = duel.ygo.commandIndex;

  const onCommandClick = (command: Command) => {
    duel.commands.startRecover();
    duel.ygo.goToCommand(command);
    duel.updateField();
    duel.commands.endRecover();
  };

  return (
    <div
      className="timeline"
      onMouseMove={cancelMouseEventsCallback}
      onClick={cancelMouseEventsCallback}
    >
      {commands.map((command: any, index: any) => {
        const commandClass = getCommandClass(index, currentCommand);
        const Command = DefaultTimelineCommand;
        return (
          <Command
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