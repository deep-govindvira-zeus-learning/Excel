import type { ExcelGrid } from "./Grid";

export interface Command {
    execute(): void;
    undo(): void;
}

export class ResizeCommand implements Command {
    constructor(
        private grid: ExcelGrid,
        private type: 'COL' | 'ROW',
        private index: number,
        private oldSize: number,
        private newSize: number
    ) {}

    execute(): void {
        if (this.type === 'COL') this.grid.dimensions.colWidths[this.index] = this.newSize;
        else this.grid.dimensions.rowHeights[this.index] = this.newSize;
        this.grid.render();
    }

    undo(): void {
        if (this.type === 'COL') this.grid.dimensions.colWidths[this.index] = this.oldSize;
        else this.grid.dimensions.rowHeights[this.index] = this.oldSize;
        this.grid.render();
    }
}

export class EditCellCommand implements Command {
    constructor(
        private grid: ExcelGrid,
        private row: number,
        private col: number,
        private oldVal: string,
        private newVal: string
    ) {}

    execute(): void {
        this.grid.dataStore.setCellValue(this.row, this.col, this.newVal);
        this.grid.render();
    }

    undo(): void {
        this.grid.dataStore.setCellValue(this.row, this.col, this.oldVal);
        this.grid.render();
    }
}

export class CommandHistory {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    public executeCommand(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; 
    }

    public undo(): void {
        const cmd = this.undoStack.pop();
        if (cmd) {
            cmd.undo();
            this.redoStack.push(cmd);
        }
    }

    public redo(): void {
        const cmd = this.redoStack.pop();
        if (cmd) {
            cmd.execute();
            this.undoStack.push(cmd);
        }
    }
}