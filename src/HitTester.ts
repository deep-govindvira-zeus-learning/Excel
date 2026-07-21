import { DraggingHScrollInteractionMode, DraggingVScrollInteractionMode, ResizingColInteractionMode, ResizingRowInteractionMode, SelectingInteractionMode } from "./InteractionMode";
import type { PointerEventContext } from "./types";

export interface IHitTester {
    test(context: PointerEventContext): boolean;
}

export class HitTestPipeline {
    private testers: IHitTester[];

    constructor(grid: any) {
        this.testers = [
            new VScrollHitTester(grid),
            new HScrollHitTester(grid),
            new ColResizeHitTester(grid),
            new RowResizeHitTester(grid),
            new ColHeaderHitTester(grid),
            new RowHeaderHitTester(grid),
            new CellSelectHitTester(grid)
        ];
    }

    public handlePointerDown(context: PointerEventContext): boolean {
        for (const tester of this.testers) {
            if (tester.test(context)) {
                return true;
            }
        }
        return false;
    }
}

export class VScrollHitTester implements IHitTester {
    constructor(private grid: any) { } // Replace 'any' with your Grid component class

    test({ mouseX, mouseY, viewW, metrics }: PointerEventContext): boolean {
        const isOverVTrack = mouseX >= viewW - this.grid.scrollManager.scrollbarThickness &&
            mouseY >= metrics.vTrackY &&
            mouseY <= metrics.vTrackY + metrics.vTrackH;

        if (!isOverVTrack) return false;

        const isOverVThumb = mouseY >= metrics.vThumbY && mouseY <= metrics.vThumbY + metrics.vThumbH;
        if (isOverVThumb) {
            this.grid.interaction = {
                mode: new DraggingVScrollInteractionMode(this.grid),
                targetIndex: -1,
                startMouseX: mouseX,
                startMouseY: mouseY - metrics.vThumbY,
                startSize: this.grid.scrollManager.scrollY
            };
        }
        return true;
    }
}

export class HScrollHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY, viewH, metrics }: PointerEventContext): boolean {
        const isOverHTrack = mouseY >= viewH - this.grid.scrollManager.scrollbarThickness &&
            mouseX >= metrics.hTrackX &&
            mouseX <= metrics.hTrackX + metrics.hTrackW;

        if (!isOverHTrack) return false;

        const isOverHThumb = mouseX >= metrics.hThumbX && mouseX <= metrics.hThumbX + metrics.hThumbW;
        if (isOverHThumb) {
            this.grid.interaction = {
                mode: new DraggingHScrollInteractionMode(this.grid),
                targetIndex: -1,
                startMouseX: mouseX - metrics.hThumbX,
                startMouseY: mouseY,
                startSize: this.grid.scrollManager.scrollX
            };
        }
        return true;
    }
}

export class ColResizeHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY }: PointerEventContext): boolean {
        const colResizeIndex = this.grid.getColResizeTarget(mouseX, mouseY);
        if (colResizeIndex === -1) return false;

        this.grid.interaction = {
            mode: new ResizingColInteractionMode(this.grid),
            targetIndex: colResizeIndex,
            startMouseX: mouseX,
            startMouseY: mouseY,
            startSize: this.grid.dimensions.colWidths[colResizeIndex]
        };
        return true;
    }
}

export class RowResizeHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY }: PointerEventContext): boolean {
        const rowResizeIndex = this.grid.getRowResizeTarget(mouseX, mouseY);
        if (rowResizeIndex === -1) return false;

        this.grid.interaction = {
            mode: new ResizingRowInteractionMode(this.grid),
            targetIndex: rowResizeIndex,
            startMouseX: mouseX,
            startMouseY: mouseY,
            startSize: this.grid.dimensions.rowHeights[rowResizeIndex]
        };
        return true;
    }
}

export class ColHeaderHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY, gridX }: PointerEventContext): boolean {
        if (mouseY >= this.grid.dimensions.headerRowHeight || mouseX <= this.grid.dimensions.headerColWidth) return false;

        const col = this.grid.dimensions.getColAtX(gridX);
        if (col !== -1) this.grid.selection.setColumnSelection(col);
        this.grid.render();
        return true;
    }
}

export class RowHeaderHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY, gridY }: PointerEventContext): boolean {
        if (mouseX >= this.grid.dimensions.headerColWidth || mouseY <= this.grid.dimensions.headerRowHeight) return false;

        const row = this.grid.dimensions.getRowAtY(gridY);
        if (row !== -1) this.grid.selection.setRowSelection(row);
        this.grid.render();
        return true;
    }
}

export class CellSelectHitTester implements IHitTester {
    constructor(private grid: any) { }

    test({ mouseX, mouseY, gridX, gridY }: PointerEventContext): boolean {
        const targetRow = this.grid.dimensions.getRowAtY(gridY);
        const targetCol = this.grid.dimensions.getColAtX(gridX);

        if (targetRow === -1 || targetCol === -1) return false;

        this.grid.interaction = {
            mode: new SelectingInteractionMode(this.grid),
            targetIndex: targetRow,
            startMouseX: targetCol,
            startMouseY: mouseY,
            startSize: 0
        };

        this.grid.scrollManager.updateMousePosition(mouseX, mouseY);
        this.grid.selection.setActiveCell(targetRow, targetCol);
        this.grid.scrollManager.startAutoScrollLoop();
        this.grid.render();
        return true;
    }
}

