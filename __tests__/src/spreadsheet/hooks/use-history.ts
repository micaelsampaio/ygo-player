import { useState } from "react";

export class HistoryCommand {
    constructor(private props: { exec: () => void, undo: () => void }) { }

    exec() {
        this.props.exec();
    }

    undo() {
        this.props.undo();
    }
}

export type UseActionsHistory = {
    hasRedo: boolean;
    hasUndo: boolean;
    redo: () => void;
    undo: () => void;
    append: (command: HistoryCommand) => void;
};

export function useActionsHistory(): UseActionsHistory {
    const [commands, setCommands] = useState<{ index: number, commands: HistoryCommand[] }>({ index: 0, commands: [] });

    console.log("TCL:: COMMANDS ", commands)

    const append = (command: HistoryCommand) => {
        setCommands((prev) => {
            const newCommands = prev.commands.slice(0, prev.index + 1);
            return {
                index: prev.index + 1,
                commands: [...newCommands, command],
            };
        });

        command.exec();
    };

    const undo = () => {
        setCommands((prev) => {
            if (prev.index > 0) {
                const newIndex = prev.index - 1;
                prev.commands[newIndex].undo();
                return { ...prev, index: newIndex };
            }
            return prev;
        });
    };

    const redo = () => {
        setCommands((prev) => {
            if (prev.index < prev.commands.length) {
                const newIndex = prev.index;
                prev.commands[newIndex].exec();
                return { ...prev, index: newIndex + 1 };
            }
            return prev;
        });
    };

    const hasUndo = commands.index > 0;
    const hasRedo = commands.index < commands.commands.length;

    return {
        hasRedo,
        hasUndo,
        redo,
        undo,
        append,
    };
}
