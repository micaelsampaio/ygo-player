import { Command } from "../../../YGOCore/types/commands";
import { YGODuel } from "../../core/YGODuel";
import { cancelMouseEventsCallback } from "../../scripts/ygo-utils";

export function TimeLine({ duel }: { duel: YGODuel }) {
    if (!duel.ygo) return null;

    const commands = duel.ygo.commands;
    const currentCommand = duel.ygo.commandIndex;

    // TODO EVENTS TO GET COMMAND ETC...

    const onCommandClick = (command: Command) => {
        // TODO DISABLE ACTIONS
        // COMPLETE ALL ACTIONS
        // EXEC
        const res = duel.ygo.goToCommand(command);
    }

    const prev = () => {
        if (duel.ygo.hasPrevCommand()) {
            duel.ygo.undo();
        }
    }

    const play = () => {
        let timer: any;
        timer = setInterval(() => {
            if (duel.ygo.hasNextCommand()) {
                duel.ygo.redo();
            } else {
                clearInterval(timer);
            }
        }, 500);
    }

    const next = () => {
        if (duel.ygo.hasNextCommand()) {
            duel.ygo.redo();
        }
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