import { useState } from "react";
import { HistoryCommand, UseActionsHistory } from "./use-history";

export interface ComboRow {
    id: number,
    cols: ComboCol[]
}

export interface ComboCol {
    id: number,
    log: any,
}

export interface ComboMaker {
    rows: ComboRow[]
    addRow: (args?: {
        log: any,
        cmd?: HistoryCommand
    }) => void
    addCol: (args: {
        rowIndex: number,
        log: any,
        cmd?: HistoryCommand
    }) => void
    createMatrix: () => any
}
let IDS = 0;

export function useComboMaker({ history }: { history: UseActionsHistory }): ComboMaker {

    const [rows, setRows] = useState<ComboRow[]>(() => {
        return [];
    });

    const addRow = (args?: {
        log: any,
        cmd?: HistoryCommand
    }) => {
        const id = IDS++;

        const rowData: ComboRow = {
            id,
            cols: args ? [{ id, log: args.log }] : [],
        };

        const historyCommand = new HistoryCommand({
            exec: () => {
                args?.cmd?.exec();
                setRows(rows => [...rows, rowData]);
            },
            undo: () => {
                args?.cmd?.undo();
                setRows(rows => rows.filter(row => row.id !== rowData.id));
            }
        });

        history.append(historyCommand);

    };

    const addCol = ({ log, rowIndex, cmd }: {
        rowIndex: number,
        log: any,
        cmd?: HistoryCommand
    }) => {
        const id = IDS++;
        const colData: ComboCol = {
            id,
            log,
        };

        const historyCommand = new HistoryCommand({
            exec: () => {

                if (cmd) cmd.exec();

                setRows(rows => {
                    return rows.map((row, i) => {
                        if (i === rowIndex) {
                            return {
                                ...row,
                                cols: [...row.cols, colData]
                            };
                        }
                        return row;
                    });
                });
            },
            undo: () => {
                if (cmd) cmd.undo();

                setRows(rows => {
                    return rows.map((row, i) => {
                        if (i === rowIndex) {
                            return {
                                ...row,
                                cols: row.cols.filter(col => col.id !== colData.id)
                            };
                        }
                        return row;
                    });
                });
            }
        });
        history.append(historyCommand);
    };

    const createMatrix = (): any => {
        return rows.map(row => {
            return row.cols.map(col => col.log);
        })
    }


    return {
        rows,
        addRow,
        addCol,
        createMatrix
    }
}