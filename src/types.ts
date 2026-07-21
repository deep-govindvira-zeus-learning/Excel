export interface CellData {
    id: number;
    firstName: string;
    lastName: string;
    Age: number;
    Salary: number;
    [key: string]: any; // This object can also have any number of additional properties that aren't explicitly named here.
}

export interface ScrollbarMetrics {
    vTrackY: number;
    vTrackH: number;
    hTrackX: number;
    hTrackW: number;
    vThumbH: number;
    hThumbW: number;
    vThumbY: number;
    hThumbX: number;
    maxScrollX: number;
    maxScrollY: number;
}

export interface PointerEventContext {
    mouseX: number;
    mouseY: number;
    viewW: number;
    viewH: number;
    gridX: number;
    gridY: number;
    metrics: ScrollbarMetrics;
}