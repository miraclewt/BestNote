import React, { useEffect, useRef, useState, useCallback } from 'react';
import './TableToolbar.css';

interface TableToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

interface ToolbarPos {
  top: number;
  left: number;
}

interface CellContext {
  cell: HTMLTableCellElement;
  row: HTMLTableRowElement;
  table: HTMLTableElement;
  colIndex: number;
}

const ZWS = '​'; // zero-width space

export const TableToolbar: React.FC<TableToolbarProps> = ({ editorRef }) => {
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Traverse from selection's startContainer up DOM to find enclosing <td>/<th>
  const getCellContext = useCallback((): CellContext | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;

    // Find enclosing <td> or <th>
    let cell: HTMLTableCellElement | null = null;
    while (node) {
      if (node instanceof HTMLTableCellElement) {
        cell = node;
        break;
      }
      node = node.parentElement;
    }
    if (!cell) return null;

    const row = cell.parentElement;
    if (!(row instanceof HTMLTableRowElement)) return null;

    const table = row.closest('table');
    if (!table) return null;

    // Compute column index (account for colspan, but for simplicity use cell index)
    const colIndex = Array.from(row.cells).indexOf(cell);

    return { cell, row, table, colIndex };
  }, []);

  const showIfInTable = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setPos(null);
      return;
    }

    const ctx = getCellContext();
    if (!ctx) {
      setPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPos({
      top: rect.top - 40 + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, [getCellContext]);

  // Helper: dispatch input event on editor to trigger Markdown sync
  const syncMarkdown = useCallback(() => {
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, [editorRef]);

  // Place cursor into a specific cell (or the first cell of a specific row)
  const focusCell = useCallback((cell: HTMLTableCellElement) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  // ─── Row operations ───

  const addRowAbove = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    const newRow = ctx.row.cloneNode(true) as HTMLTableRowElement;
    // Clear content of all cells in new row
    Array.from(newRow.cells).forEach(c => { c.innerHTML = ZWS; });

    ctx.row.parentElement!.insertBefore(newRow, ctx.row);
    syncMarkdown();
    focusCell(newRow.cells[Math.min(ctx.colIndex, newRow.cells.length - 1)] as HTMLTableCellElement);
    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  const addRowBelow = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    const newRow = ctx.row.cloneNode(true) as HTMLTableRowElement;
    Array.from(newRow.cells).forEach(c => { c.innerHTML = ZWS; });

    ctx.row.parentElement!.insertBefore(newRow, ctx.row.nextSibling);
    syncMarkdown();
    focusCell(newRow.cells[Math.min(ctx.colIndex, newRow.cells.length - 1)] as HTMLTableCellElement);
    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  const deleteRow = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    const allRows = ctx.table.querySelectorAll('tr');
    if (allRows.length <= 1) {
      // Last row — delete entire table instead
      deleteTableInner(ctx.table);
      return;
    }

    const parent = ctx.row.parentElement!;
    const nextRow = ctx.row.nextElementSibling as HTMLTableRowElement | null;
    const prevRow = ctx.row.previousElementSibling as HTMLTableRowElement | null;
    parent.removeChild(ctx.row);

    // Try to focus next row, then prev row
    const targetRow = nextRow || prevRow;
    if (targetRow) {
      focusCell(targetRow.cells[Math.min(ctx.colIndex, targetRow.cells.length - 1)] as HTMLTableCellElement);
    }

    syncMarkdown();
    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  // ─── Column operations ───

  const addColumnLeft = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    const allRows = ctx.table.querySelectorAll('tr');
    allRows.forEach(row => {
      const cells = row.cells;
      const refCell = cells[ctx.colIndex];
      const newCell = document.createElement(refCell?.tagName || 'td');
      newCell.innerHTML = ZWS;
      if (refCell) {
        row.insertBefore(newCell, refCell);
      } else {
        row.appendChild(newCell);
      }
    });

    syncMarkdown();
    // Focus the newly inserted cell in the current row
    const newCell = ctx.row.cells[ctx.colIndex] as HTMLTableCellElement | undefined;
    if (newCell) focusCell(newCell);
    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  const addColumnRight = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    const allRows = ctx.table.querySelectorAll('tr');
    allRows.forEach(row => {
      const cells = row.cells;
      const refCell = cells[ctx.colIndex + 1] || null;
      const newCell = document.createElement(refCell?.tagName || 'td');
      newCell.innerHTML = ZWS;
      if (refCell) {
        row.insertBefore(newCell, refCell);
      } else {
        row.appendChild(newCell);
      }
    });

    syncMarkdown();
    const newCell = ctx.row.cells[ctx.colIndex + 1] as HTMLTableCellElement | undefined;
    if (newCell) focusCell(newCell);
    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  const deleteColumn = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;

    // Check if first row would have 0 cells after deletion
    const firstRow = ctx.table.querySelector('tr');
    if (firstRow && firstRow.cells.length <= 1) {
      deleteTableInner(ctx.table);
      return;
    }

    const allRows = ctx.table.querySelectorAll('tr');
    allRows.forEach(row => {
      const cell = row.cells[ctx.colIndex];
      if (cell) row.removeChild(cell);
    });

    syncMarkdown();
    // Focus a cell in the same row near the deleted column
    const remainingCells = ctx.row.cells;
    if (remainingCells.length > 0) {
      const idx = Math.min(ctx.colIndex, remainingCells.length - 1);
      focusCell(remainingCells[idx] as HTMLTableCellElement);
    }

    showIfInTable();
  }, [getCellContext, syncMarkdown, focusCell, showIfInTable]);

  // ─── Delete table ───

  const deleteTableInner = useCallback((table: HTMLTableElement) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = document.createRange();
    range.selectNode(table);
    range.deleteContents();

    // Collapse at the deletion point
    sel.removeAllRanges();
    sel.addRange(range);
    range.collapse(false);

    setPos(null);

    // Sync
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, [editorRef]);

  const deleteTable = useCallback(() => {
    const ctx = getCellContext();
    if (!ctx) return;
    deleteTableInner(ctx.table);
  }, [getCellContext, deleteTableInner]);

  // ─── Event listeners ───

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onSelection = () => setTimeout(showIfInTable, 0);
    const onMouseUp = () => setTimeout(showIfInTable, 10);

    document.addEventListener('selectionchange', onSelection);
    editor.addEventListener('mouseup', onMouseUp);
    editor.addEventListener('keyup', onSelection);
    return () => {
      document.removeEventListener('selectionchange', onSelection);
      editor.removeEventListener('mouseup', onMouseUp);
      editor.removeEventListener('keyup', onSelection);
    };
  }, [editorRef, showIfInTable]);

  // Hide when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setPos(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!pos) return null;

  return (
    <div
      ref={toolbarRef}
      className="table-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()}
    >
      <button className="tt-btn" onClick={addRowAbove} title="上方插入行">
        行↑
      </button>
      <button className="tt-btn" onClick={addRowBelow} title="下方插入行">
        行↓
      </button>
      <button className="tt-btn" onClick={addColumnLeft} title="左侧插入列">
        列←
      </button>
      <button className="tt-btn" onClick={addColumnRight} title="右侧插入列">
        列→
      </button>
      <span className="tt-divider" />
      <button className="tt-btn tt-btn--danger" onClick={deleteRow} title="删除行">
        删行
      </button>
      <button className="tt-btn tt-btn--danger" onClick={deleteColumn} title="删除列">
        删列
      </button>
      <span className="tt-divider" />
      <button className="tt-btn tt-btn--danger" onClick={deleteTable} title="删除表格">
        删表
      </button>
    </div>
  );
};

export default TableToolbar;
