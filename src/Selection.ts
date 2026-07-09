import { SelectionRange, SelectionType } from "./types.js";

export class SelectionManager {
    public type: SelectionType = 'NONE';
    public range: SelectionRange | null = null;

    public setCellRange(startRow: number, startCol: number, endRow: number, endCol: number): void {
        this.type = 'CELL_RANGE';
        this.range = {
            startRow: Math.min(startRow, endRow),
            startCol: Math.min(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            endCol: Math.max(startCol, endCol)
        };
    }

    public setRowSelection(row: number): void {
        this.type = 'ROW';
        this.range = { startRow: row, startCol: 0, endRow: row, endCol: 499 };
    }

    public setColumnSelection(col: number): void {
        this.type = 'COLUMN';
        this.range = { startRow: 0, startCol: col, endRow: 99999, endCol: col };
    }

    public clear(): void {
        this.type = 'NONE';
        this.range = null;
    }
}