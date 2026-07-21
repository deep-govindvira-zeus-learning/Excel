import { ResizeCommand } from "./Commands";
import { ExcelGrid } from "./Grid";

export class InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) { }

    public onPointerMove(): void { }
    public onPointerUp(): void {}
}

export class NoneInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        if (this.grid.getColResizeTarget(this.mouseX, this.mouseY) !== -1) this.grid.getCanvas().style.cursor = 'col-resize';
        else if (this.grid.getRowResizeTarget(this.mouseX, this.mouseY) !== -1) this.grid.getCanvas().style.cursor = 'row-resize';
        else this.grid.getCanvas().style.cursor = 'default';
    }
}

export class DraggingVScrollInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        const metrics = this.grid.scrollManager.getScrollbarMetrics();
        const deltaY = this.mouseY - metrics.vTrackY - this.grid.interaction.startMouseY;
        const trackRange = metrics.vTrackH - metrics.vThumbH;
        this.grid.scrollManager.scrollY = Math.max(0, Math.min(metrics.maxScrollY, (deltaY / trackRange) * metrics.maxScrollY));
        if (this.grid.editManager.hasActiveEditCell()) this.grid.editManager.updateInlineInputPosition();
        this.grid.render();
    }
}

export class DraggingHScrollInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        const metrics = this.grid.scrollManager.getScrollbarMetrics();
        const deltaX = this.mouseX - metrics.hTrackX - this.grid.interaction.startMouseX;
        const trackRange = metrics.hTrackW - metrics.hThumbW;
        this.grid.scrollManager.scrollX = Math.max(0, Math.min(metrics.maxScrollX, (deltaX / trackRange) * metrics.maxScrollX));
        if (this.grid.editManager.hasActiveEditCell()) this.grid.editManager.updateInlineInputPosition();
        this.grid.render();
    }
}

export class ResizingColInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        const deltaX = this.mouseX - this.grid.interaction.startMouseX;
        this.grid.dimensions.colWidths[this.grid.interaction.targetIndex] = Math.max(20, this.grid.interaction.startSize + deltaX);
        this.grid.recalculateTotalContentSizes();
        this.grid.render();
    }

    public onPointerUp(): void {
        const idx = this.grid.interaction.targetIndex;
        const finalSize = this.grid.dimensions.colWidths[idx];
        this.grid.dimensions.colWidths[idx] = this.grid.interaction.startSize;
        this.grid.history.executeCommand(new ResizeCommand(this.grid, 'COL', idx, this.grid.interaction.startSize, finalSize));
        this.grid.recalculateTotalContentSizes();
    }
}


export class ResizingRowInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        const deltaY = this.mouseY - this.grid.interaction.startMouseY;
        this.grid.dimensions.rowHeights[this.grid.interaction.targetIndex] = Math.max(15, this.grid.interaction.startSize + deltaY);
        this.grid.recalculateTotalContentSizes();
        this.grid.render();
    }

    public onPointerUp(): void {
        const idx = this.grid.interaction.targetIndex;
        const finalSize = this.grid.dimensions.rowHeights[idx];
        this.grid.dimensions.rowHeights[idx] = this.grid.interaction.startSize;
        this.grid.history.executeCommand(new ResizeCommand(this.grid, 'ROW', idx, this.grid.interaction.startSize, finalSize));
        this.grid.recalculateTotalContentSizes();
    }
}

export class SelectingInteractionMode extends InteractionMode {
    constructor(public grid: ExcelGrid, public mouseX: number = -1, public mouseY: number = -1) {
        super(grid, mouseX, mouseY);
    }

    public onPointerMove(): void {
        const gridX = this.mouseX + this.grid.scrollManager.scrollX;
        const gridY = this.mouseY + this.grid.scrollManager.scrollY;

        this.grid.scrollManager.updateMousePosition(this.mouseX, this.mouseY);
        const currRow = this.grid.dimensions.getRowAtY(gridY);
        const currCol = this.grid.dimensions.getColAtX(gridX);
        if (currRow !== -1 && currCol !== -1) {
            this.grid.selection.extendTo(currRow, currCol);
            this.grid.render();
        }
    }
}
