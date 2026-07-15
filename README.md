# Excel Grid View

# Objective

Not to use DOM element, which fails to load 10000 of rows. The objective of this project is to prove out a canvas-based virtual grid that can smoothly display 100,000 rows × 500 columns while still supporting the interactions people expect from a real spreadsheet.

# How to Install
```
aws sso login
aws codeartifact login --tool npm --domain <domain> --domain-owner <domain-owner> --repository <repo-name>

mkdir excel-grid-view ;
cd excel-grid-view ;
npm init -y ;
npm install --save-dev typescript @types/node ;
npx tsc --init ;
mkdir src ;
```

`tsconfig.js`

```
{
  "compilerOptions": {
    "target": "ES6",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

```
rm -rf dist ;
npx tsc ; 
npx esbuild dist/Grid.js --bundle --outfile=dist/bundle.js ;

rmdir dist ;
npx tsc ; 
npx esbuild dist/Grid.js --bundle --outfile=dist/bundle.js ;
```

# Features

- Supports 100,000 × 500 cells
- Click a cell to select it, click-drag to select a range
- Click a row or column header to select the entire row/column
- Shows Count / Sum / Min / Max / Average for the currently selected numeric cells, recalculated on every selection change
- Drag a header border to resize; resize is undoable
- Supports Arrow Key, Tab, Shift + Tab, Enter and Esc kye keyboard navigation to cell
- Canvas-drawn vertical/horizontal scrollbars, draggable, plus mouse-wheel and edge auto-scroll while selecting
- Ctrl/Cmd+Z and Ctrl/Cmd+Y undo/redo cell edits and column/row resizes

# Folder Structure

```
Excel/
├── index.html            # Page shell: <canvas>, status bar, loads dist/bundle.js
├── package.json
├── tsconfig.json
├── docs/
│   └── Screenshot ...png # Reference screenshot of the running grid
└── src/
    ├── Constants.ts       # MAX_ROWS, MAX_COLS, RECORDS — single source of truth for grid size
    ├── types.ts            # CellData interface used by mock/loaded data
    ├── Dimensions.ts       # DimensionManager: column widths, row heights, index <-> pixel math
    ├── DataStore.ts        # DataStore: sparse cell values, mock data generation, aggregate metrics
    ├── Selection.ts        # SelectionManager: active/anchor cell, selection ranges
    ├── Commands.ts         # Command interface, ResizeCommand, EditCellCommand, CommandHistory (undo/redo)
    ├── ScrollManager.ts     # ScrollManager: scrollX/scrollY, custom scrollbars, auto-scroll, ensureCellVisible
    ├── EditManager.ts       # EditManager: floating <input> lifecycle for inline cell editing
    ├── Renderer.ts          # Renderer: all canvas drawing (cells, headers, selection box, scrollbars, status bar)
    └── Grid.ts              # ExcelGrid: owns all managers, wires up mouse/keyboard event listeners
```

# How OOP Concepts Are Applied

- **Encapsulation** — Each manager (`DimensionManager`, `DataStore`, `SelectionManager`, `ScrollManager`, `EditManager`, `CommandHistory`) owns its own private state (e.g. `DataStore`'s `cellValues` map, `ScrollManager`'s `scrollX/scrollY`) and only exposes a small public method surface (`getCellValue`, `setCellValue`, `ensureCellVisible`, etc.). Nothing outside a manager reaches into its internals directly.
- **Composition over inheritance** — `ExcelGrid` is composed of independent collaborators (`dimensions`, `dataStore`, `selection`, `history`, `scrollManager`, `editManager`, `renderer`) rather than being one giant class or an inheritance chain.
- **Polymorphism** — `ResizeCommand` and `EditCellCommand` both implement the same `Command` interface (`execute()` / `undo()`), so `CommandHistory` can push, undo, and redo either kind of command without knowing which one it's holding.

# How SOLID Principles Are Applied

- **SRP** — `Renderer` only draws; it never mutates state. `DataStore` only stores/reads/aggregates values; it never touches the DOM or canvas.
- **Open/Closed Principle** — New undoable actions can be added by writing a new class that implements `Command`, without modifying `CommandHistory` at all. The new keyboard-navigation feature was added the same way: `moveActiveCell()` was added to `Grid.ts` and `setActiveCell()` / `extendTo()` were added to `SelectionManager` as new methods, without changing how existing mouse-selection or rendering code works.
- **Liskov Substitution Principle** — Anywhere a `Command` is expected (inside `CommandHistory.executeCommand/undo/redo`), any concrete implementation (`ResizeCommand`, `EditCellCommand`, or a future one) can be substituted without breaking the caller, because both fully honor the `execute()/undo()` contract (each undo is the exact inverse of its execute).
- **Dependency Inversion Principle** — `ScrollManager` and `EditManager` are constructed with a reference to `grid` rather than hard-coding references to specific other managers — they depend on the grid's public shape, not on each other directly.

# How Virtual Rendering Works

The grid is logically 100,000 rows × 500 columns, but the DOM/canvas only ever contains what fits in the viewport:

1. On every `render()` call, `Renderer` computes the visible pixel window from `window.innerWidth/innerHeight` and the current `scrollX`/`scrollY`.
2. It walks rows starting from `y = headerRowHeight - scrollY` and **skips forward-accumulating `y`** for rows that are fully above the viewport (`currentY + rowH < headerRowHeight`), and **breaks out of the loop entirely** the moment a row starts below the viewport (`currentY > viewH`). The same logic runs for columns on the X axis inside the row loop.
3. Because of this early skip/break, drawing a screen showing ~40 rows × ~15 columns costs roughly `40 × 15` cell-draw calls — regardless of whether the sheet has 100 rows or 100,000 rows underneath it.
4. `ctx.clip()` is used to constrain drawing to the grid viewport rectangle so partially-visible edge rows/columns are cleanly clipped rather than manually cropped in JS.
5. `DimensionManager.getColAtX` / `getRowAtY` and `getColX` / `getRowY` provide the pixel ↔ index conversions used both by rendering and by hit-testing (mouse clicks, resize handles). These currently do a linear scan; that is the main scalability limit at extreme scroll offsets — see **Known Limitations** below.
6. Cell **data** is only ever read for the cells being drawn (`dataStore.getCellValue(r, c)` inside the render loop) — nothing is copied out into a bigger in-memory "visible cells" structure, keeping memory flat regardless of scroll position.

# How Data Is Generated and Loaded

- `Constants.ts` defines `MAX_ROWS = 100000`, `MAX_COLS = 500`, and `RECORDS = 50000` (how many rows actually get mock data — the remaining rows exist as empty, addressable grid space).
- `DataStore` stores cell values in a single `Map<string, string>` keyed by `"row,col"`. This is a **sparse** structure — an empty cell simply has no entry in the map, so 100,000 × 500 addressable cells cost nothing until they're written to.
- `DataStore.colKeys` defines the logical columns: `id`, `firstName`, `lastName`, `Age`, `Salary`, followed by generated `CustomCol_5`, `CustomCol_6`, ... up to `MAX_COLS`, so every one of the 500 columns has a name even though only 5 are populated with meaningful data.
- `generateAndLoadMockData()` builds `RECORDS` (50,000) `CellData` objects by cycling through small arrays of first/last names and deriving `Age`/`Salary` from the row index with modulo arithmetic, so the data looks varied without needing a random number generator or external dataset.
- `loadJsonData(records)` is the generic loader underneath the mock generator: it takes any array of `CellData`-shaped objects and writes each field into the sparse map via `setCellValue(rowIndex, colIndex, value)`, keyed by matching `colKeys` order. This is also the method you'd call to load real JSON data instead of the mock set.
- `computeMetrics(startRow, startCol, endRow, endCol)` scans the requested rectangle, parses numeric cells, and returns `{ count, sum, min, max, avg }` — this is what powers the live status bar for the current selection.

## How Undo/Redo Works

Undo/redo is entirely driven by the **Command pattern** described above:

- Every resize (`mouseup` after `RESIZING_COL`/`RESIZING_ROW`) and every committed cell edit (`EditManager.commitCellEdit`, only if the value actually changed) is wrapped in a `Command` and run through `history.executeCommand(...)`.
- `Ctrl/Cmd + Z` calls `history.undo()`, which pops the most recent command off `undoStack`, calls its `undo()`, and pushes it onto `redoStack`.
- `Ctrl/Cmd + Y` calls `history.redo()`, which pops from `redoStack`, calls `execute()` again, and pushes it back onto `undoStack`.
- Performing a **new** action after undoing clears `redoStack`, matching standard editor behavior (you can't redo into a branch that no longer exists).
- Undo/redo shortcuts are intercepted both on the main `window` keydown listener (`Grid.initKeyboardEvents`) and inside the inline edit `<input>` (`EditManager`), so `Ctrl+Z` works whether or not you're actively typing in a cell — while actively editing, the shortcut is caught and `stopPropagation()`'d so the browser's native input-undo doesn't fire instead.

## Test Cases Covered (20)

The project doesn't ship an automated test runner; the following is the manual test matrix used to verify behavior (each is easily converted into a Jest/Playwright test if automation is added later — see Next Improvements).

1. **Initial load** — grid renders with 50,000 rows of mock data and correct column headers (A, B, C, ... AA, AB, ...).
2. **Click a cell** — selects exactly that cell; status bar shows Count 1 (if numeric) with matching Sum/Min/Max/Avg.
3. **Click-drag a range** — selects a rectangular range; status bar aggregates all numeric cells in range.
4. **Click a column header** — selects the entire column (`type = 'COLUMN'`).
5. **Click a row header** — selects the entire row (`type = 'ROW'`).
6. **Double-click a cell** — opens the inline `<input>` positioned exactly over the cell, pre-filled with its current value.
7. **Edit + blur** — clicking away from the input commits the new value via `EditCellCommand`.
8. **Edit + Enter** — commits the edit and moves the active cell one row down (new).
9. **Edit + Escape** — discards the typed value; original cell value is unchanged.
10. **Edit + Tab / Shift+Tab** — commits the edit and moves the active cell right / left (new).
11. **Arrow key navigation** — pressing `↑ ↓ ← →` moves the active cell by one step each press, and does not throw at the boundary (row 0, col 0, last row, last col).
12. **Shift+Arrow range extension** — starting from a selected cell, `Shift+→` twice then `Shift+↓` once produces a 2×2 range anchored at the original cell (new).
13. **Escape collapses selection** — after extending a range with Shift+Arrow, pressing `Escape` collapses the highlighted range back to a single cell, the active cell (new).
14. **Keyboard scroll-into-view (vertical)** — repeatedly pressing `↓` near the bottom edge of the viewport scrolls the grid down just enough to keep the active cell visible, without over-scrolling (new).
15. **Keyboard scroll-into-view (horizontal)** — repeatedly pressing `→` near the right edge scrolls horizontally the same way (new).
16. **Column resize** — dragging a column border resizes it live; releasing commits a `ResizeCommand`.
17. **Row resize** — same as above, for row height via `ResizeCommand`.
18. **Undo (Ctrl/Cmd+Z)** — undoes the most recent edit or resize, restoring the prior value/size and re-rendering.
19. **Redo (Ctrl/Cmd+Y)** — re-applies the most recently undone action; a new action after an undo correctly clears the redo stack.
20. **Mouse-wheel + custom scrollbar drag** — both scrolling methods stay in sync with each other and with keyboard-driven scrolling (`ensureCellVisible` and wheel/drag scrolling all read/write the same `scrollX`/`scrollY` state), and the inline editor (if open) repositions correctly during all three.

## Performance Observations

- **Rendering cost is proportional to viewport size, not data size.** Scrolling from row 0 to row 99,999 does not change frame cost — only the ~40 rows currently on screen are ever drawn (see *Virtual Rendering* above).
- **Sparse storage keeps memory flat.** 50,000,000 theoretically addressable cells (100,000 × 500) never allocate memory for the ~44,000,000 that are empty, since `DataStore` only stores entries that were explicitly set.
- **Resize and drag-selection re-render on every `mousemove`.** This is intentionally uncapped for responsiveness; on very large monitors with a fully expanded selection this is the most CPU-visible operation, since `computeMetrics` re-scans the whole selected rectangle on every `render()` call, which is O(selected cells) — a full-column selection (100,000 rows) noticeably slows the status bar update compared to a small range.
- **`getColAtX`/`getRowAtY`/`getColX`/`getRowY` are O(n) linear scans** over `colWidths`/`rowHeights`. This is unnoticeable for hit-testing near the top-left of the sheet, but scrolled deep into a 100,000-row sheet, every mouse move, click, and keyboard navigation step pays a linear cost proportional to the row/column index. This is the top target for optimization (see Known Limitations).
- **Keyboard navigation adds negligible overhead** — `moveActiveCell` does O(1) arithmetic plus one `ensureCellVisible` call (O(n) for the same reason as above) and one `render()`, so its cost is dominated by the existing render/hit-testing cost, not by anything new.

## Accessibility Considerations

- **Current state: canvas-based rendering means the grid is not natively screen-reader accessible.** A `<canvas>` is a single opaque bitmap to assistive technology — none of the individual cells, headers, or selection state are exposed to the accessibility tree today.
- **Keyboard operability**, however, is now substantially better: the grid can be fully navigated (move active cell, extend selection, edit, commit, cancel) without a mouse, which benefits keyboard-only users even without screen-reader support, and lays groundwork for future ARIA integration.
- The inline edit `<input>` is a real DOM element, so it *does* pick up native browser accessibility features (focus outline, IME support, screen-reader announcement of its value) while a cell is being edited — accessibility is currently strongest at the exact moment you're editing a cell, and weakest while just navigating/viewing.
- Color contrast: selection highlight uses a semi-transparent green fill (`rgba(16, 124, 65, 0.1)`) with a solid 2px green outline, chosen to be visible against the white cell background, but this has not been checked against WCAG contrast ratios.
- No live region currently announces the active cell, its address (e.g. "B12"), or its value when navigating with arrow keys — a screen reader user has no way to know where they are.

## Known Limitations and Next Improvements

**Known limitations**
- No automated test suite — the 20 test cases above are manual/exploratory, not executable.
- `getColAtX`/`getRowAtY`/`getColX`/`getRowY` are O(n) linear scans, which slows down hit-testing and keyboard scroll-into-view calculations the further into the sheet you are (see Performance Observations).
- No copy/paste, cell formulas, formatting, multi-select of disjoint ranges, or column/row insertion/deletion.
- Undo/redo only covers cell edits and resizes — selection changes, scroll position, and keyboard navigation are intentionally not undoable, which is correct behavior but worth calling out explicitly.
- No screen-reader accessibility for the canvas grid itself (see Accessibility Considerations).
- Arrow keys while a cell is actively being edited move the text cursor inside the input (standard text-editing behavior) rather than the active cell — this is intentional but differs from some spreadsheet apps that use arrows to *commit and move* even mid-edit.
- Row/column header selection (`ROW`/`COLUMN` types) sets the active cell to column 0 / row 0 respectively, which is a reasonable default but not tuned for keyboard continuation from a full-row/column selection.

**Next improvements**
- Replace the linear `getColAtX`/`getRowAtY` scans with prefix-sum / binary-search lookups (or a Fenwick tree) so hit-testing and scroll-into-view stay fast at extreme scroll offsets.
- Add `Home`/`End`/`Ctrl+Arrow`/`Page Up`/`Page Down` navigation for faster movement across large sheets.
- Add an automated test suite (e.g. Playwright for interaction tests, Jest for the pure-logic classes like `DataStore`, `Dimensions`, `Commands`, `Selection`) covering the 20 cases above.
- Add ARIA live-region announcements of the active cell address and value for screen readers.
- Support copy/paste and basic formulas (`=SUM(...)`, etc.), building on the existing `computeMetrics` aggregation logic.
