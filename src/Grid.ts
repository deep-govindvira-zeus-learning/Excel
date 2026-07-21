import { DimensionManager } from "./Dimensions.js";
import { DataStore } from "./DataStore.js";
import { SelectionManager } from "./Selection.js";
import { CommandHistory, ResizeCommand } from "./Commands.js";
import { ScrollManager } from "./ScrollManager.js";
import { EditManager } from "./EditManager.js";
import { Renderer } from "./Renderer.js";
import { MAX_COLS, MAX_ROWS } from "./Constants.js";
import { DraggingHScrollInteractionMode, DraggingVScrollInteractionMode, InteractionMode, InteractionModeHandler, NoneInteractionMode, ResizingColInteractionMode, ResizingRowInteractionMode, SelectingInteractionMode } from "./InteractionMode.js";

export class ExcelGrid {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    public dimensions: DimensionManager;
    public dataStore: DataStore;
    public selection: SelectionManager;
    public history: CommandHistory;
    public scrollManager: ScrollManager;
    public editManager: EditManager;
    private renderer: Renderer;

    public interaction: { mode: InteractionMode; targetIndex: number; startMouseX: number; startMouseY: number; startSize: number } =
        { mode: new NoneInteractionMode(this), targetIndex: -1, startMouseX: 0, startMouseY: 0, startSize: 0 };

    public totalWidth: number = 0;
    public totalHeight: number = 0;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.dimensions = new DimensionManager(MAX_ROWS, MAX_COLS);
        this.dataStore = new DataStore();
        this.selection = new SelectionManager();
        this.history = new CommandHistory();
        this.scrollManager = new ScrollManager(this);
        this.editManager = new EditManager(this);
        this.renderer = new Renderer(this);

        this.dataStore.generateAndLoadMockData();
        this.recalculateTotalContentSizes();
        this.initResize();
        this.initMouseEvents();
        this.initKeyboardEvents();
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    public render(): void {
        this.renderer.render();
    }

    public recalculateTotalContentSizes(): void {
        this.totalWidth = this.dimensions.headerColWidth + this.dimensions.colWidths.reduce((a, b) => a + b, 0);
        this.totalHeight = this.dimensions.headerRowHeight + this.dimensions.rowHeights.reduce((a, b) => a + b, 0);
    }

    private initResize(): void {
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = window.innerWidth * dpr;
            this.canvas.height = (window.innerHeight - 25) * dpr;
            this.canvas.style.width = `${window.innerWidth}px`;
            this.canvas.style.height = `${window.innerHeight - 25}px`;
            this.ctx.scale(dpr, dpr);
            this.scrollManager.clampScrollBounds();
            this.render();
        };
        window.addEventListener("resize", resize);
        resize();
    }

    private initMouseEvents(): void {
        this.canvas.addEventListener('pointerdown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const viewW = window.innerWidth;
            const viewH = window.innerHeight - 25;

            const metrics = this.scrollManager.getScrollbarMetrics();

            if (mouseX >= viewW - this.scrollManager.scrollbarThickness && mouseY >= metrics.vTrackY && mouseY <= viewH - this.scrollManager.scrollbarThickness) {
                if (mouseY >= metrics.vThumbY && mouseY <= metrics.vThumbY + metrics.vThumbH) {
                    this.interaction = { mode: new DraggingVScrollInteractionMode(this), targetIndex: -1, startMouseX: mouseX, startMouseY: mouseY - metrics.vThumbY, startSize: this.scrollManager.scrollY };
                }
                return;
            }

            if (mouseY >= viewH - this.scrollManager.scrollbarThickness && mouseX >= metrics.hTrackX && mouseX <= viewW - this.scrollManager.scrollbarThickness) {
                if (mouseX >= metrics.hThumbX && mouseX <= metrics.hThumbX + metrics.hThumbW) {
                    this.interaction = { mode: new DraggingHScrollInteractionMode(this), targetIndex: -1, startMouseX: mouseX - metrics.hThumbX, startMouseY: mouseY, startSize: this.scrollManager.scrollX };
                }
                return;
            }

            const gridX = mouseX + this.scrollManager.scrollX;
            const gridY = mouseY + this.scrollManager.scrollY;

            const colResizeIndex = this.getColResizeTarget(mouseX, mouseY);
            if (colResizeIndex !== -1) {
                this.interaction = { mode: new ResizingColInteractionMode(this), targetIndex: colResizeIndex, startMouseX: mouseX, startMouseY: mouseY, startSize: this.dimensions.colWidths[colResizeIndex] };
                return;
            }

            const rowResizeIndex = this.getRowResizeTarget(mouseX, mouseY);
            if (rowResizeIndex !== -1) {
                this.interaction = { mode: new ResizingRowInteractionMode(this), targetIndex: rowResizeIndex, startMouseX: mouseX, startMouseY: mouseY, startSize: this.dimensions.rowHeights[rowResizeIndex] };
                return;
            }

            if (mouseY < this.dimensions.headerRowHeight && mouseX > this.dimensions.headerColWidth) {
                const col = this.dimensions.getColAtX(gridX);
                if (col !== -1) this.selection.setColumnSelection(col);
                this.render();
                return;
            }
            if (mouseX < this.dimensions.headerColWidth && mouseY > this.dimensions.headerRowHeight) {
                const row = this.dimensions.getRowAtY(gridY);
                if (row !== -1) this.selection.setRowSelection(row);
                this.render();
                return;
            }

            const targetRow = this.dimensions.getRowAtY(gridY);
            const targetCol = this.dimensions.getColAtX(gridX);
            if (targetRow !== -1 && targetCol !== -1) {
                this.interaction = { mode: new SelectingInteractionMode(this), targetIndex: targetRow, startMouseX: targetCol, startMouseY: mouseY, startSize: 0 };

                this.scrollManager.updateMousePosition(mouseX, mouseY);
                this.selection.setActiveCell(targetRow, targetCol);
                this.scrollManager.startAutoScrollLoop();
                this.render();
            }
        });

        this.canvas.addEventListener('pointermove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            
            this.interaction.mode.mouseX =  e.clientX - rect.left;;
            this.interaction.mode.mouseY =  e.clientY - rect.top;
            
            const interactionModeHandler = new InteractionModeHandler(this.interaction.mode);
            interactionModeHandler.onPointerMove();

            // mode.perform();

            // if (this.interaction.mode === 'NONE') {
            //     if (this.getColResizeTarget(mouseX, mouseY) !== -1) this.canvas.style.cursor = 'col-resize';
            //     else if (this.getRowResizeTarget(mouseX, mouseY) !== -1) this.canvas.style.cursor = 'row-resize';
            //     else this.canvas.style.cursor = 'default';
            // }

            // if (this.interaction.mode === 'DRAGGING_V_SCROLL') {
            //     const deltaY = mouseY - metrics.vTrackY - this.interaction.startMouseY;
            //     const trackRange = metrics.vTrackH - metrics.vThumbH;
            //     this.scrollManager.scrollY = Math.max(0, Math.min(metrics.maxScrollY, (deltaY / trackRange) * metrics.maxScrollY));
            //     if (this.editManager.hasActiveEditCell()) this.editManager.updateInlineInputPosition();
            //     this.render();
            //     return;
            // }

            // if (this.interaction.mode === 'DRAGGING_H_SCROLL') {
            //     const deltaX = mouseX - metrics.hTrackX - this.interaction.startMouseX;
            //     const trackRange = metrics.hTrackW - metrics.hThumbW;
            //     this.scrollManager.scrollX = Math.max(0, Math.min(metrics.maxScrollX, (deltaX / trackRange) * metrics.maxScrollX));
            //     if (this.editManager.hasActiveEditCell()) this.editManager.updateInlineInputPosition();
            //     this.render();
            //     return;
            // }

            // if (this.interaction.mode === 'RESIZING_COL') {
            //     const deltaX = mouseX - this.interaction.startMouseX;
            //     this.dimensions.colWidths[this.interaction.targetIndex] = Math.max(20, this.interaction.startSize + deltaX);
            //     this.recalculateTotalContentSizes();
            //     this.render();
            // } else if (this.interaction.mode === 'RESIZING_ROW') {
            //     const deltaY = mouseY - this.interaction.startMouseY;
            //     this.dimensions.rowHeights[this.interaction.targetIndex] = Math.max(15, this.interaction.startSize + deltaY);
            //     this.recalculateTotalContentSizes();
            //     this.render();
            // } else if (this.interaction.mode === 'SELECTING') {
            //     this.scrollManager.updateMousePosition(mouseX, mouseY);
            //     const currRow = this.dimensions.getRowAtY(gridY);
            //     const currCol = this.dimensions.getColAtX(gridX);
            //     if (currRow !== -1 && currCol !== -1) {
            //         this.selection.extendTo(currRow, currCol);
            //         this.render();
            //     }
            // }
        });

        window.addEventListener('pointerup', () => {
            this.scrollManager.stopAutoScrollLoop();

            const interactionModeHandler = new InteractionModeHandler(this.interaction.mode);
            interactionModeHandler.onPointerUp();

            // if (this.interaction.mode instanceof ResizingColInteractionMode) {
            //     const idx = this.interaction.targetIndex;
            //     const finalSize = this.dimensions.colWidths[idx];
            //     this.dimensions.colWidths[idx] = this.interaction.startSize;
            //     this.history.executeCommand(new ResizeCommand(this, 'COL', idx, this.interaction.startSize, finalSize));
            //     this.recalculateTotalContentSizes();
            // } else if (this.interaction.mode instanceof ResizingRowInteractionMode) {
            //     const idx = this.interaction.targetIndex;
            //     const finalSize = this.dimensions.rowHeights[idx];
            //     this.dimensions.rowHeights[idx] = this.interaction.startSize;
            //     this.history.executeCommand(new ResizeCommand(this, 'ROW', idx, this.interaction.startSize, finalSize));
            //     this.recalculateTotalContentSizes();
            // }
            this.interaction.mode = new NoneInteractionMode(this);
        });

        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const r = this.dimensions.getRowAtY(mouseY + this.scrollManager.scrollY);
            const c = this.dimensions.getColAtX(mouseX + this.scrollManager.scrollX);
            if (r !== -1 && c !== -1) {
                this.selection.setActiveCell(r, c);
                this.editManager.startCellEdit(r, c);
            }
        });
    }

    private initKeyboardEvents(): void {
        window.addEventListener('keydown', (e) => {
            if (this.editManager.hasActiveEditCell()) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.history.undo(); return; }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.history.redo(); return; }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveActiveCell(-1, 0, e.shiftKey);
                    return;
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveActiveCell(1, 0, e.shiftKey);
                    return;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveActiveCell(0, -1, e.shiftKey);
                    return;
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveActiveCell(0, 1, e.shiftKey);
                    return;
                case 'Tab':
                    // Tab / Shift+Tab move active cell right.
                    e.preventDefault();
                    this.moveActiveCell(0, e.shiftKey ? -1 : 1, false);
                    return;
                case 'Enter':
                    // down .
                    e.preventDefault();
                    this.moveActiveCell(1, 0, false);
                    return;
                case 'Escape':
                    // make one active cell.
                    e.preventDefault();
                    this.selection.setActiveCell(this.selection.activeRow, this.selection.activeCol);
                    this.render();
                    return;
            }
        });
    }
    
    public moveActiveCell(deltaRow: number, deltaCol: number, extend: boolean): void {
        const maxRow = this.dimensions.rowHeights.length - 1;
        const maxCol = this.dimensions.colWidths.length - 1;

        const newRow = Math.min(Math.max(this.selection.activeRow + deltaRow, 0), maxRow);
        const newCol = Math.min(Math.max(this.selection.activeCol + deltaCol, 0), maxCol);

        if (extend) {
            this.selection.extendTo(newRow, newCol);
        } else {
            this.selection.setActiveCell(newRow, newCol);
        }

        this.scrollManager.ensureCellVisible(newRow, newCol);
        if (this.editManager.hasActiveEditCell()) this.editManager.updateInlineInputPosition();
        this.render();
    }

    public getColResizeTarget(x: number, y: number): number {
        if (y > this.dimensions.headerRowHeight) return -1;
        let currentX = this.dimensions.headerColWidth - this.scrollManager.scrollX;
        for (let i = 0; i < this.dimensions.colWidths.length; i++) {
            currentX += this.dimensions.colWidths[i];
            if (Math.abs(x - currentX) < 4) return i;
        }
        return -1;
    }

    public getRowResizeTarget(x: number, y: number): number {
        if (x > this.dimensions.headerColWidth) return -1;
        let currentY = this.dimensions.headerRowHeight - this.scrollManager.scrollY;
        for (let i = 0; i < this.dimensions.rowHeights.length; i++) {
            currentY += this.dimensions.rowHeights[i];
            if (Math.abs(y - currentY) < 4) return i;
        }
        return -1;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new ExcelGrid("excelCanvas");
});