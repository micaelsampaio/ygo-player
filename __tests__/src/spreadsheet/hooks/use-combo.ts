import { useState } from "react";

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
    }) => void
    addCol: (args: {
        rowIndex: number,
        log: any,
    }) => void
    createMatrix: () => any
}
let IDS = 0;

export function useComboMaker(): ComboMaker {
    const [rows, setRows] = useState<ComboRow[]>(() => {
        return [];
    });

    const addRow = (args?: {
        log: any,
    }) => {
        const id = IDS++;

        const rowData: ComboRow = {
            id,
            cols: args ? [{ id, log: args.log }] : []
        };

        setRows(rows => [...rows, rowData]);
    };

    const addCol = ({ log, rowIndex }: {
        rowIndex: number,
        log: any,
    }) => {
        const id = IDS++;
        const colData: ComboCol = {
            id,
            log,
        };

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