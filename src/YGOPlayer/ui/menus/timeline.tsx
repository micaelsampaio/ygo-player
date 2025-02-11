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
        if (duel.commands.isRecovering()) return;
        duel.commands.startRecover();

        if (duel.ygo.hasPrevCommand()) {
            duel.ygo.undo();
        }

        duel.updateField();
        duel.commands.endRecover();
    }

    const next = () => {
        if (duel.commands.isRecovering()) return;

        if (duel.ygo.hasNextCommand()) {
            duel.ygo.redo();
        }
    }

    const play = () => {
        const nextEvent = () => {
            if (duel.ygo.hasNextCommand()) {
                setTimeout(() => duel.ygo.redo(), 500);
            } else {
                duel.events.off("commands-process-completed", nextEvent);
            }
        }

        duel.events.on("commands-process-completed", nextEvent);

        nextEvent();
    }

    return <div className="timeline" onMouseMove={cancelMouseEventsCallback} onClick={cancelMouseEventsCallback}>
        <div style={{ flexGrow: "unset" }}><button onClick={play}>play</button></div>
        <div style={{ flexGrow: "unset" }}><button onClick={prev}>Prev Play</button></div>
        <div style={{ flexGrow: "unset" }}><button onClick={next}>Next Play</button></div>
        {commands.map((command, index) => {
            const commandClass = getCommandClass(index, currentCommand);
            const color = getCommandColor(command);
            return <button className={`command ${commandClass} ${color}`} onClick={() => onCommandClick(command)}>
                <div className="command-tooltip">{(command as any).type}</div>
            </button>
        })}
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