import { ExcelGrid } from "./Grid.js";
import { EditCellCommand } from "./Commands.js";

export class EditManager {
    private grid: ExcelGrid;
    private inlineInput!: HTMLInputElement;
    private activeEditCell: { row: number; col: number } | null = null;

    constructor(grid: ExcelGrid) {
        this.grid = grid;
        this.createInlineInput();
    }

    public hasActiveEditCell(): boolean {
        return this.activeEditCell !== null;
    }

    public getActiveEditCell() {
        return this.activeEditCell;
    }

    private createInlineInput(): void {
        this.inlineInput = document.createElement('input');
        this.inlineInput.style.position = 'absolute';
        this.inlineInput.style.display = 'none';
        this.inlineInput.style.font = '12px Segoe UI';
        this.inlineInput.style.border = '2px solid #107c41';
        this.inlineInput.style.outline = 'none';
        this.inlineInput.style.padding = '0 2px';
        document.body.appendChild(this.inlineInput);

        this.inlineInput.addEventListener('blur', () => this.commitCellEdit());
        this.inlineInput.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'y')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.commitCellEdit();
                this.grid.moveActiveCell(1, 0, false);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.cancelCellEdit();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                this.commitCellEdit();
                this.grid.moveActiveCell(0, e.shiftKey ? -1 : 1, false);
            }
        });
    }

    public startCellEdit(row: number, col: number): void {
        this.activeEditCell = { row, col };
        this.inlineInput.value = this.grid.dataStore.getCellValue(row, col);
        this.inlineInput.style.display = 'block';
        this.updateInlineInputPosition();
        this.inlineInput.focus();
    }

    public updateInlineInputPosition(): void {
        if (!this.activeEditCell) return;
        const { row, col } = this.activeEditCell;
        const dims = this.grid.dimensions;
        const scrollMgr = this.grid.scrollManager;

        const x = dims.getColX(col) - scrollMgr.scrollX;
        const y = dims.getRowY(row) - scrollMgr.scrollY;
        const w = dims.colWidths[col];
        const h = dims.rowHeights[row];

        if (x < dims.headerColWidth || y < dims.headerRowHeight) {
            this.inlineInput.style.display = 'none';
        } else {
            this.inlineInput.style.display = 'block';
            this.inlineInput.style.left = `${x}px`;
            this.inlineInput.style.top = `${y}px`;
            this.inlineInput.style.width = `${w}px`;
            this.inlineInput.style.height = `${h}px`;
        }
    }

    public commitCellEdit(): void {
        if (!this.activeEditCell) return;
        const { row, col } = this.activeEditCell;
        const oldVal = this.grid.dataStore.getCellValue(row, col);
        const newVal = this.inlineInput.value;
        this.inlineInput.style.display = 'none';
        this.activeEditCell = null;

        if (oldVal !== newVal) {
            this.grid.history.executeCommand(new EditCellCommand(this.grid, row, col, oldVal, newVal));
        }
    }

    public cancelCellEdit(): void {
        this.inlineInput.style.display = 'none';
        this.activeEditCell = null;
        this.grid.render();
    }
}