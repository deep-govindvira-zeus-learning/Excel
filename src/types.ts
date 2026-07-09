export interface CellData {
    id: number;
    firstName: string;
    lastName: string;
    Age: number;
    Salary: number;
    [key: string]: any; // This object can also have any number of additional properties that aren't explicitly named here.
}