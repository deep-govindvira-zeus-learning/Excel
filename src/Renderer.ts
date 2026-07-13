import { ExcelGrid } from "./Grid.js";

export class Renderer {
    private grid: ExcelGrid;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(grid: ExcelGrid) {
        this.grid = grid;
        this.canvas = grid.getCanvas();
        this.ctx = grid.getContext();
    }

    public render(): void {
        const ctx = this.ctx;
        const dims = this.grid.dimensions;
        const scrollMgr = this.grid.scrollManager;
        const viewW = window.innerWidth;
        const viewH = window.innerHeight - 25;

        ctx.clearRect(0, 0, viewW, viewH);
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.textBaseline = "middle";

        ctx.save();

        // --- GRID VIEWPORT (CLIPPED) ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(
            dims.headerColWidth, 
            dims.headerRowHeight, 
            viewW - dims.headerColWidth - scrollMgr.scrollbarThickness, 
            viewH - dims.headerRowHeight - scrollMgr.scrollbarThickness
        );
        ctx.clip();

        let currentY = dims.headerRowHeight - scrollMgr.scrollY;
        for (let r = 0; r < dims.rowHeights.length; r++) {
            const rowH = dims.rowHeights[r];
            if (currentY + rowH < dims.headerRowHeight) { currentY += rowH; continue; }
            if (currentY > viewH) break;

            let currentX = dims.headerColWidth - scrollMgr.scrollX;
            for (let c = 0; c < dims.colWidths.length; c++) {
                const colW = dims.colWidths[c];
                if (currentX + colW < dims.headerColWidth) { currentX += colW; continue; }
                if (currentX > viewW) break;

                let isSelected = false;
                if (this.grid.selection.range) {
                    const sel = this.grid.selection.range;
                    isSelected = (r >= sel.startRow && r <= sel.endRow && c >= sel.startCol && c <= sel.endCol);
                }

                if (isSelected) {
                    ctx.fillStyle = "rgba(16, 124, 65, 0.1)";
                    ctx.fillRect(currentX, currentY, colW, rowH);
                }

                ctx.strokeStyle = "#d4d4d4";
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.floor(currentX) + 0.5, Math.floor(currentY) + 0.5, colW, rowH);

                const val = this.grid.dataStore.getCellValue(r, c);
                if (val) {
                    ctx.fillStyle = "#000000";
                    ctx.textAlign = isNaN(Number(val)) ? "left" : "right";
                    const txtX = isNaN(Number(val)) ? currentX + 4 : currentX + colW - 4;
                    ctx.save();
                    ctx.beginPath(); // to define new shape
                    ctx.rect(currentX, currentY, colW, rowH); // create invisible empty box
                    ctx.clip(); // draw only inside box, this is permenet so must be restore by using ctx.restore().
                    ctx.fillText(val, txtX, currentY + rowH / 2); // draw
                    ctx.restore(); // go back to previous save
                }
                currentX += colW;
            }
            currentY += rowH;
        }

        // --- HIGHLIGHT SELECTION ---
        if (this.grid.selection.range && this.grid.selection.type !== 'NONE') {
            const sel = this.grid.selection.range;
            const sX = dims.getColX(sel.startCol) - scrollMgr.scrollX;
            const sY = dims.getRowY(sel.startRow) - scrollMgr.scrollY;
            let eX = dims.getColX(sel.endCol) + dims.colWidths[sel.endCol] - scrollMgr.scrollX;
            let eY = dims.getRowY(sel.endRow) + dims.rowHeights[sel.endRow] - scrollMgr.scrollY;

            ctx.strokeStyle = "#107c41";
            ctx.lineWidth = 2;
            ctx.strokeRect(sX, sY, eX - sX, eY - sY);
        }
        ctx.restore();

        // --- EXCEL COL HEADERS ---
        let headerX = dims.headerColWidth - scrollMgr.scrollX;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(dims.headerColWidth, 0, viewW - dims.headerColWidth - scrollMgr.scrollbarThickness, dims.headerRowHeight);
        for (let c = 0; c < dims.colWidths.length; c++) {
            const colW = dims.colWidths[c];
            if (headerX + colW < dims.headerColWidth) { headerX += colW; continue; }
            if (headerX > viewW - scrollMgr.scrollbarThickness) break;

            ctx.strokeStyle = "#c0c0c0";
            ctx.strokeRect(Math.floor(headerX) + 0.5, 0.5, colW, dims.headerRowHeight);
            ctx.fillStyle = "#5f6368";
            ctx.textAlign = "center";
            ctx.fillText(dims.getColLabel(c), headerX + colW / 2, dims.headerRowHeight / 2);
            headerX += colW;
        }

        // --- EXCEL ROW HEADERS ---
        let headerY = dims.headerRowHeight - scrollMgr.scrollY;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, dims.headerRowHeight, dims.headerColWidth, viewH - dims.headerRowHeight - scrollMgr.scrollbarThickness);
        for (let r = 0; r < dims.rowHeights.length; r++) {
            const rowH = dims.rowHeights[r];
            if (headerY + rowH < dims.headerRowHeight) { headerY += rowH; continue; }
            if (headerY > viewH - scrollMgr.scrollbarThickness) break;

            ctx.strokeStyle = "#c0c0c0";
            ctx.strokeRect(0.5, Math.floor(headerY) + 0.5, dims.headerColWidth, rowH);
            ctx.fillStyle = "#5f6368";
            ctx.textAlign = "center";
            ctx.fillText((r + 1).toString(), dims.headerColWidth / 2, headerY + rowH / 2);
            headerY += rowH;
        }

        // Top Left dead-zone
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, dims.headerColWidth, dims.headerRowHeight);
        ctx.strokeStyle = "#c0c0c0";
        ctx.strokeRect(0.5, 0.5, dims.headerColWidth, dims.headerRowHeight);

        // --- RENDER SCROLLBARS ---
        const scrollMetrics = scrollMgr.getScrollbarMetrics();
        ctx.fillStyle = "#f0f0f0";

        // Vertical
        ctx.fillRect(viewW - scrollMgr.scrollbarThickness, scrollMetrics.vTrackY, scrollMgr.scrollbarThickness, scrollMetrics.vTrackH);
        ctx.fillStyle = this.grid.interaction.mode === 'DRAGGING_V_SCROLL' ? "#787878" : "#c1c1c1";
        ctx.fillRect(viewW - scrollMgr.scrollbarThickness + 2, scrollMetrics.vThumbY, scrollMgr.scrollbarThickness - 4, scrollMetrics.vThumbH);

        // Horizontal
        ctx.fillStyle = "#f0f0f0";
        ctx.fillRect(scrollMetrics.hTrackX, viewH - scrollMgr.scrollbarThickness, scrollMetrics.hTrackW, scrollMgr.scrollbarThickness);
        ctx.fillStyle = this.grid.interaction.mode === 'DRAGGING_H_SCROLL' ? "#787878" : "#c1c1c1";
        ctx.fillRect(scrollMetrics.hThumbX, viewH - scrollMgr.scrollbarThickness + 2, scrollMetrics.hThumbW, scrollMgr.scrollbarThickness - 4);

        // Corner Gap
        ctx.fillStyle = "#f3f3f3";
        ctx.fillRect(viewW - scrollMgr.scrollbarThickness, viewH - scrollMgr.scrollbarThickness, scrollMgr.scrollbarThickness, scrollMgr.scrollbarThickness);

        ctx.restore();
        this.updateStatusBar();
    }

    private updateStatusBar(): void {
        const statusBar = document.getElementById("statusBar")!;
        if (this.grid.selection.range && this.grid.selection.type !== 'NONE') {
            const { startRow, startCol, endRow, endCol } = this.grid.selection.range;
            const metrics = this.grid.dataStore.computeMetrics(startRow, startCol, endRow, endCol);

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