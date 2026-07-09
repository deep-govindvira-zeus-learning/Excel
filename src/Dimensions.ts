export class DimensionManager {
    public colWidths: number[] = [];
    public rowHeights: number[] = [];
    public defaultWidth = 100;
    public defaultHeight = 24;
    public headerRowHeight = 26;
    public headerColWidth = 50;

    constructor(totalRows: number, totalCols: number) {
        for (let i = 0; i < totalCols; i++) this.colWidths.push(this.defaultWidth);
        for (let i = 0; i < totalRows; i++) this.rowHeights.push(this.defaultHeight);
    }

    // A, B, C, ... , Z, AA, AB, ...
    public getColLabel(index: number): string {
        let label = "";
        let temp = index;
        while (temp >= 0) {
            label = String.fromCharCode((temp % 26) + 65) + label;
            temp = Math.floor(temp / 26) - 1;
        }
        return label;
    }

    // Convert X coordinate to Column Index
    public getColAtX(x: number): number {
        let currentX = this.headerColWidth;
        for (let i = 0; i < this.colWidths.length; i++) {
            if (x >= currentX && x <= currentX + this.colWidths[i]) return i;
            currentX += this.colWidths[i];
        }
        return -1;
    }

    // Convert Y coordinate to Row Index
    public getRowAtY(y: number): number {
        let currentY = this.headerRowHeight;
        for (let i = 0; i < this.rowHeights.length; i++) {
            if (y >= currentY && y <= currentY + this.rowHeights[i]) return i;
            currentY += this.rowHeights[i];
        }
        return -1;
    }

    // Convert Column Index to X coordinate 
    public getColX(colIndex: number): number {
        let x = this.headerColWidth;
        for (let i = 0; i < colIndex; i++) x += this.colWidths[i];
        return x;
    }

    // Convert Row Index to Y coordinate
    public getRowY(rowIndex: number): number {
        let y = this.headerRowHeight;
        for (let i = 0; i < rowIndex; i++) y += this.rowHeights[i];
        return y;
    }
}