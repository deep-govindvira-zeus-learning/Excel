import { ExcelGrid } from "./Grid.js";

export class ScrollManager {
    private grid: ExcelGrid;
    public scrollX: number = 0;
    public scrollY: number = 0;
    public readonly scrollbarThickness = 14;

    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private autoScrollAnimationId: number | null = null;

    constructor(grid: ExcelGrid) {
        this.grid = grid;
        this.initScrollEvents();
    }

    public clampScrollBounds(): void {
        const viewW = window.innerWidth;
        const viewH = window.innerHeight - 25;
        const maxScrollX = Math.max(0, this.grid.totalWidth - viewW + this.scrollbarThickness);
        const maxScrollY = Math.max(0, this.grid.totalHeight - viewH + this.scrollbarThickness);
        this.scrollX = Math.min(this.scrollX, maxScrollX);
        this.scrollY = Math.min(this.scrollY, maxScrollY);
    }

    private initScrollEvents(): void {
        this.grid.getCanvas().addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scrollX = Math.max(0, this.scrollX + e.deltaX);
            this.scrollY = Math.max(0, this.scrollY + e.deltaY);
            this.clampScrollBounds();

            if (this.grid.editManager.hasActiveEditCell()) {
                this.grid.editManager.updateInlineInputPosition();
            }
            this.grid.render();
        }, { passive: false });
    }

    public getScrollbarMetrics() {
        const viewW = window.innerWidth;
        const viewH = window.innerHeight - 25;
        const dims = this.grid.dimensions;

        const vTrackY = dims.headerRowHeight;
        const vTrackH = viewH - vTrackY - this.scrollbarThickness;
        const hTrackX = dims.headerColWidth;
        const hTrackW = viewW - hTrackX - this.scrollbarThickness;

        const vThumbH = Math.max(30, (vTrackH / this.grid.totalHeight) * vTrackH);
        const hThumbW = Math.max(30, (hTrackW / this.grid.totalWidth) * hTrackW);

        const maxScrollY = Math.max(1, this.grid.totalHeight - viewH + this.scrollbarThickness);
        const vThumbY = vTrackY + (this.scrollY / maxScrollY) * (vTrackH - vThumbH);

        const maxScrollX = Math.max(1, this.grid.totalWidth - viewW + this.scrollbarThickness);
        const hThumbX = hTrackX + (this.scrollX / maxScrollX) * (hTrackW - hThumbW);

        return { vTrackY, vTrackH, hTrackX, hTrackW, vThumbH, hThumbW, vThumbY, hThumbX, maxScrollX, maxScrollY };
    }

    public updateMousePosition(x: number, y: number): void {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    // to update scrollbar when cell goes out of screen
    public ensureCellVisible(row: number, col: number): void {
        const dims = this.grid.dimensions;
        const viewW = window.innerWidth;
        const viewH = window.innerHeight - 25;

        const cellX = dims.getColX(col);
        const cellW = dims.colWidths[col];
        const cellY = dims.getRowY(row);
        const cellH = dims.rowHeights[row];

        const viewLeft = dims.headerColWidth + this.scrollX;
        const viewRight = (viewW - this.scrollbarThickness) + this.scrollX;
        const viewTop = dims.headerRowHeight + this.scrollY;
        const viewBottom = (viewH - this.scrollbarThickness) + this.scrollY;

        if (cellX < viewLeft) {
            this.scrollX = cellX - dims.headerColWidth;
        } else if (cellX + cellW > viewRight) {
            this.scrollX = (cellX + cellW) - (viewW - this.scrollbarThickness);
        }

        if (cellY < viewTop) {
            this.scrollY = cellY - dims.headerRowHeight;
        } else if (cellY + cellH > viewBottom) {
            this.scrollY = (cellY + cellH) - (viewH - this.scrollbarThickness);
        }

        this.scrollX = Math.max(0, this.scrollX);
        this.scrollY = Math.max(0, this.scrollY);
        this.clampScrollBounds();
    }

    public startAutoScrollLoop(): void {
        if (this.autoScrollAnimationId) return;

        const loop = () => {
            if (this.grid.interaction.mode !== 'SELECTING') {
                this.stopAutoScrollLoop();
                return;
            }

            const viewW = window.innerWidth;
            const viewH = window.innerHeight - 25;
            const edgeThreshold = 35;
            const scrollSpeed = 16;

            let scrolled = false;

            if (this.lastMouseY > viewH - this.scrollbarThickness - edgeThreshold) {
                this.scrollY += scrollSpeed;
                scrolled = true;
            } else if (this.lastMouseY < this.grid.dimensions.headerRowHeight + edgeThreshold) {
                this.scrollY = Math.max(0, this.scrollY - scrollSpeed);
                scrolled = true;
            }

            if (this.lastMouseX > viewW - this.scrollbarThickness - edgeThreshold) {
                this.scrollX += scrollSpeed;
                scrolled = true;
            } else if (this.lastMouseX < this.grid.dimensions.headerColWidth + edgeThreshold) {
                this.scrollX = Math.max(0, this.scrollX - scrollSpeed);
                scrolled = true;
            }

            if (scrolled) {
                this.clampScrollBounds();

                const gridX = this.lastMouseX + this.scrollX;
                const gridY = this.lastMouseY + this.scrollY;

                const currRow = this.grid.dimensions.getRowAtY(gridY);
                const currCol = this.grid.dimensions.getColAtX(gridX);

                if (currRow !== -1 && currCol !== -1) {
                    this.grid.selection.extendTo(currRow, currCol);
                }
                this.grid.render();
            }

            this.autoScrollAnimationId = requestAnimationFrame(loop);
        };

        this.autoScrollAnimationId = requestAnimationFrame(loop);
    }

    public stopAutoScrollLoop(): void {
        if (this.autoScrollAnimationId !== null) {
            cancelAnimationFrame(this.autoScrollAnimationId);
            this.autoScrollAnimationId = null;
        }
    }
}