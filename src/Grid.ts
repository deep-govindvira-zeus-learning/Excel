import { CommandHistory } from "./Commands";
import { DataStore } from "./DataStore";
import { DimensionManager } from "./Dimensions";
import { SelectionManager } from "./Selection";

export class ExcelGrid {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private inlineInput!: HTMLInputElement;

    public dimensions: DimensionManager;
    public dataStore: DataStore;
    public selection: SelectionManager;
    public history: CommandHistory;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;

        this.dimensions = new DimensionManager(100000, 500);
        this.dataStore = new DataStore();
        this.selection = new SelectionManager();
        this.history = new CommandHistory();
        this.dataStore.generateAndLoadMockData();
    }

    public render(): void {
    }

}