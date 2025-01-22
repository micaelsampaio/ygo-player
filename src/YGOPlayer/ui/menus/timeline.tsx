import { Command } from "../../../YGOCore/types/commands";
import { YGODuel } from "../../core/YGODuel";
import { cancelMouseEventsCallback } from "../../scripts/ygo-utils";

export function TimeLine({ duel }: { duel: YGODuel }) {
    if (!duel.ygo) return null;

    const commands = duel.ygo.commands;
    const currentCommand = duel.ygo.commandIndex;

    const onCommandClick = (command: Command) => {
        duel.commands.startRecover();
        duel.ygo.goToCommand(command);
        duel.updateField();
        duel.commands.endRecover();
    }

    const prev = () => {
        duel.commands.startRecover();

        if (duel.ygo.hasPrevCommand()) {
            duel.ygo.undo();
        }

        duel.updateField();
        duel.commands.endRecover();
    }

    const play = () => {
        const nextEvent = () => {
            if (duel.ygo.hasNextCommand()) {
                duel.ygo.redo();
            } else {
                duel.events.off("commands-process-completed", nextEvent);
            }
        }

        duel.events.on("commands-process-completed", nextEvent);

        nextEvent();
    }

    const next = () => {
        duel.commands.startRecover();

        if (duel.ygo.hasNextCommand()) {
            duel.ygo.redo();
        }

        duel.updateField();
        duel.commands.endRecover();
    }

    return <div className="timeline" onMouseMove={cancelMouseEventsCallback} onClick={cancelMouseEventsCallback}>
        <div style={{ flexGrow: "unset" }}><button onClick={play}>play</button></div>
        <div style={{ flexGrow: "unset" }}><button onClick={prev}>prev</button></div>
        {commands.map((command, index) => {
            const commandClass = getCommandClass(index, currentCommand);
            const color = getCommandColor(command);
            return <button className={`command ${commandClass} ${color}`} onClick={() => onCommandClick(command)}>
                <div className="command-tooltip">{(command as any).type}</div>
            </button>
        })}
        <div style={{ flexGrow: "unset" }}><button onClick={next}>next</button></div>
    </div>
}

function getCommandClass(index: number, currentCommand: number) {
    if (index === currentCommand) return "current";
    if (index < currentCommand) return "prev";
    return "next";
}

function getCommandColor(command: any) {
    switch (command.type) {
        case "Normal Summon":
            return `normal_summon`
        default:
            return ``
    }
}