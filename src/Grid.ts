import { DimensionManager } from "./Dimensions.js";
import { DataStore } from "./DataStore.js";
import { SelectionManager } from "./Selection.js";
import { CommandHistory, ResizeCommand, EditCellCommand } from "./Commands.js"
import { MAX_COLS, MAX_ROWS } from "./Constants.js";

export class ExcelGrid {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private inlineInput!: HTMLInputElement;

    public dimensions: DimensionManager;
    public dataStore: DataStore;
    public selection: SelectionManager;
    public history: CommandHistory;

    private activeEditCell: { row: number; col: number } | null = null;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.dimensions = new DimensionManager(MAX_ROWS, MAX_COLS);
        this.dataStore = new DataStore();
        this.selection = new SelectionManager();
        this.history = new CommandHistory();

        this.dataStore.generateAndLoadMockData();
        this.createInlineInput();
        this.initResize();
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

        // event fires when an element loses focus
        this.inlineInput.addEventListener('blur', () => this.commitCellEdit());
        // event fires the exact moment a user presses a key
        this.inlineInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.commitCellEdit();
            if (e.key === 'Escape') this.cancelCellEdit();
        });
    }

    private initResize(): void {
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = window.innerWidth * dpr; // Increase Internal Canvas Resolution
            this.canvas.height = (window.innerHeight - 25) * dpr;
            this.canvas.style.width = `${window.innerWidth}px`;
            this.canvas.style.height = `${window.innerHeight - 25}px`;
            this.ctx.scale(dpr, dpr); // multiplies all future drawing inputs by `dpr` automatically
            this.render();
        };
        window.addEventListener("resize", resize);
        resize();
    }

    private commitCellEdit(): void {
        if (!this.activeEditCell) return;
        const { row, col } = this.activeEditCell;
        const oldVal = this.dataStore.getCellValue(row, col);
        const newVal = this.inlineInput.value;
        this.inlineInput.style.display = 'none';
        this.activeEditCell = null;

        if (oldVal !== newVal) {
            this.history.executeCommand(new EditCellCommand(this, row, col, oldVal, newVal));
        }
    }

    private cancelCellEdit(): void {
        this.inlineInput.style.display = 'none';
        this.activeEditCell = null;
        this.render();
    }

    public render(): void {
        const ctx = this.ctx;
        const dims = this.dimensions;
        const viewW = window.innerWidth;
        const viewH = window.innerHeight - 25;

        ctx.clearRect(0, 0, viewW, viewH);
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.textBaseline = "middle";

        ctx.save();

        // --- CORE DATA GRID CELL VIEWPORT (CLIPPED BOUNDS) ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(dims.headerColWidth, dims.headerRowHeight, viewW - dims.headerColWidth, viewH - dims.headerRowHeight);
        ctx.clip();

        let currentY = dims.headerRowHeight;
        for (let r = 0; r < dims.rowHeights.length; r++) {
            const rowH = dims.rowHeights[r];
            if (currentY > viewH) break;

            let currentX = dims.headerColWidth;
            for (let c = 0; c < dims.colWidths.length; c++) {
                const colW = dims.colWidths[c];
                if (currentX > viewW) break;

                let isSelected = false;
                if (this.selection.range) {
                    const sel = this.selection.range;
                    isSelected = (r >= sel.startRow && r <= sel.endRow && c >= sel.startCol && c <= sel.endCol);
                }

                if (isSelected) {
                    ctx.fillStyle = "rgba(16, 124, 65, 0.1)"; // background color of 
                    ctx.fillRect(currentX, currentY, colW, rowH);
                }

                ctx.strokeStyle = "#d4d4d4"; // border
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.floor(currentX) + 0.5, Math.floor(currentY) + 0.5, colW, rowH);
                // Why 0.5 is added? This is a common canvas optimization trick to prevent blurry, anti-aliased 1px lines.

                const val = this.dataStore.getCellValue(r, c);
                if (val) {
                    ctx.fillStyle = "#000000";
                    ctx.textAlign = isNaN(Number(val)) ? "left" : "right";
                    const txtX = isNaN(Number(val)) ? currentX + 4 : currentX + colW - 4;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(currentX, currentY, colW, rowH);
                    ctx.clip();
                    ctx.fillText(val, txtX, currentY + rowH / 2);
                    ctx.restore();
                }
                currentX += colW;
            }
            currentY += rowH;
        }

        // --- HIGHLIGHT SELECTION OUTLINES ---
        if (this.selection.range && this.selection.type !== 'NONE') {
            const sel = this.selection.range;
            const sX = dims.getColX(sel.startCol);
            const sY = dims.getRowY(sel.startRow);
            let eX = dims.getColX(sel.endCol) + dims.colWidths[sel.endCol];
            let eY = dims.getRowY(sel.endRow) + dims.rowHeights[sel.endRow];

            ctx.strokeStyle = "#107c41";
            ctx.lineWidth = 2;
            ctx.strokeRect(sX, sY, eX - sX, eY - sY);
        }
        ctx.restore();

        // --- STICKY FREEZE EXCEL HEADERS ---
        let headerX = dims.headerColWidth;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(dims.headerColWidth, 0, viewW - dims.headerColWidth, dims.headerRowHeight);
        for (let c = 0; c < dims.colWidths.length; c++) {
            const colW = dims.colWidths[c];
            if (headerX > viewW) break;

            ctx.strokeStyle = "#c0c0c0";
            ctx.strokeRect(Math.floor(headerX) + 0.5, 0.5, colW, dims.headerRowHeight);
            ctx.fillStyle = "#5f6368";
            ctx.textAlign = "center";
            ctx.fillText(dims.getColLabel(c), headerX + colW / 2, dims.headerRowHeight / 2);
            headerX += colW;
        }

        let headerY = dims.headerRowHeight;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, dims.headerRowHeight, dims.headerColWidth, viewH - dims.headerRowHeight);
        for (let r = 0; r < dims.rowHeights.length; r++) {
            const rowH = dims.rowHeights[r];
            if (headerY > viewH) break;

            ctx.strokeStyle = "#c0c0c0";
            ctx.strokeRect(0.5, Math.floor(headerY) + 0.5, dims.headerColWidth, rowH);
            ctx.fillStyle = "#5f6368";
            ctx.textAlign = "center";
            ctx.fillText((r + 1).toString(), dims.headerColWidth / 2, headerY + rowH / 2);
            headerY += rowH;
        }

        // Top Left Core dead-zone square
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, dims.headerColWidth, dims.headerRowHeight);
        ctx.strokeStyle = "#c0c0c0";
        ctx.strokeRect(0.5, 0.5, dims.headerColWidth, dims.headerRowHeight);

        ctx.restore();
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const statusBar = document.getElementById("statusBar")!;
        if (this.selection.range && this.selection.type !== 'NONE') {
            const { startRow, startCol, endRow, endCol } = this.selection.range;
            const metrics = this.dataStore.computeMetrics(startRow, startCol, endRow, endCol);

            if (metrics.count > 0) {
                statusBar.innerHTML = `
                    <span><b>Count:</b> ${metrics.count}</span>
                    <span><b>Sum:</b> ${metrics.sum.toLocaleString()}</span>
                    <span><b>Min:</b> ${metrics.min.toLocaleString()}</span>
                    <span><b>Max:</b> ${metrics.max.toLocaleString()}</span>
                    <span><b>Average:</b> ${metrics.avg.toFixed(2)}</span>
                `;
                return;
            }
        }
        statusBar.innerHTML = `<span>Ready (Select numbers to compute metrics)</span>`;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new ExcelGrid("excelCanvas");
});