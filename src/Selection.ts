// import { SelectionRange, SelectionType } from "./types.js";

export class SelectionManager {
    public type: 'NONE' | 'CELL_RANGE' | 'ROW' | 'COLUMN' = 'NONE';
    public range: {
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
    } | null = null;

    // anchor cell => selection began
    // active cell => current focus
    public anchorRow: number = 0;
    public anchorCol: number = 0;
    public activeRow: number = 0;
    public activeCol: number = 0;

    public setCellRange(startRow: number, startCol: number, endRow: number, endCol: number): void {
        this.type = 'CELL_RANGE';
        this.range = {
            startRow: Math.min(startRow, endRow),
            startCol: Math.min(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            endCol: Math.max(startCol, endCol)
        };
    }

    public setActiveCell(row: number, col: number): void {
        this.anchorRow = row;
        this.anchorCol = col;
        this.activeRow = row;
        this.activeCol = col;
        this.setCellRange(row, col, row, col);
    }

    public extendTo(row: number, col: number): void {
        this.activeRow = row;
        this.activeCol = col;
        this.setCellRange(this.anchorRow, this.anchorCol, row, col);
    }

    public setRowSelection(row: number): void {
        this.type = 'ROW';
        this.anchorRow = row;
        this.anchorCol = 0;
        this.activeRow = row;
        this.activeCol = 0;
        this.range = { startRow: row, startCol: 0, endRow: row, endCol: 499 };
    }

    public setColumnSelection(col: number): void {
        this.type = 'COLUMN';
        this.anchorRow = 0;
        this.anchorCol = col;
        this.activeRow = 0;
        this.activeCol = col;
        this.range = { startRow: 0, startCol: col, endRow: 99999, endCol: col };
    }

    public clear(): void {
        this.type = 'NONE';
        this.range = null;
    }
}