import { RECORDS } from "./Constants.js";
import { CellData } from "./types.js";

export class DataStore {
    private cellValues: Map<string, string> = new Map(); // key = row + col
    public colKeys: string[] = ["id", "firstName", "lastName", "Age", "Salary"];

    constructor() {
        for (let i = 5; i < 500; i++) {
            this.colKeys.push(`CustomCol_${i}`);
        }
    }

    public generateAndLoadMockData(): void {
        const firstNames = ["Raj", "Amit", "Neha", "Priya", "Rahul", "Vikram", "Siddharth"];
        const lastNames = ["Solanki", "Shah", "Sharma", "Patel", "Verma", "Mehta", "Joshi"];
        const records: CellData[] = [];

        for (let i = 1; i <= RECORDS; i++) {
            const record: CellData = {
                id: i,
                firstName: firstNames[i % firstNames.length],
                lastName: lastNames[i % lastNames.length],
                Age: 20 + (i % 40),
                Salary: 500000 + (i % 20) * 50000
            };
            records.push(record);
        }

        this.loadJsonData(records);
    }

    public loadJsonData(records: CellData[]): void {
        records.forEach((record, rowIndex) => {
            this.colKeys.forEach((key, colIndex) => {
                if (record[key] !== undefined) {
                    this.setCellValue(rowIndex, colIndex, String(record[key]));
                }
            });
        });
    }

    public getCellValue(row: number, col: number): string {
        return this.cellValues.get(`${row},${col}`) || "";
    }

    public setCellValue(row: number, col: number, value: string): void {
        this.cellValues.set(`${row},${col}`, value);
    }

    public computeMetrics(startRow: number, startCol: number, endRow: number, endCol: number) {
        let count = 0;
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const val = parseFloat(this.getCellValue(r, c));
                if (!isNaN(val)) {
                    count++;
                    sum += val;
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
        }

        return {
            count,
            sum,
            min: count > 0 ? min : 0,
            max: count > 0 ? max : 0,
            avg: count > 0 ? sum / count : 0
        };
    }
}