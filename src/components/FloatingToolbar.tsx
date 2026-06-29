import React, { useEffect, useRef, useState, useCallback } from 'react';
import './FloatingToolbar.css';

interface FloatingToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

interface ToolbarPos {
  top: number;
  left: number;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ editorRef }) => {
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const gridPickerRef = useRef<HTMLDivElement>(null);

  // --- Grid picker state ---
  const [showGridPicker, setShowGridPicker] = useState(false);
  const [gridPickerSize, setGridPickerSize] = useState({ rows: 3, cols: 3 });

  const showAtSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setPos(null);
      setShowGridPicker(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPos({
      top: rect.top - 40 + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, []);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    showAtSelection();
  };

  const handleWikiLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString() || '链接';
    const target = prompt('WikiLink 目标笔记名（不含 .md）:', text);
    if (!target) return;

    const link = document.createElement('a');
    link.className = 'wikilink exists';
    link.setAttribute('data-target', target.endsWith('.md') ? target : `${target}.md`);
    link.textContent = text;
    link.href = '#';
    range.deleteContents();
    range.insertNode(link);
    setPos(null);
  };

  const handleInlineCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    const code = document.createElement('code');
    code.textContent = text;
    range.deleteContents();
    range.insertNode(code);
    setPos(null);
  };

  // --- Table insertion ---
  const insertTable = useCallback((rows: number, cols: number) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Delete selected content and insert table at cursor
    range.deleteContents();

    const table = document.createElement('table');

    // Build <thead> with one row of <th>
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const th = document.createElement('th');
      th.innerHTML = '​'; // zero-width space so cursor can enter
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Build <tbody> with requested rows of <td>
    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows - 1; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '​';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    range.insertNode(table);

    // Collapse cursor into first <th>
    const firstCell = table.querySelector('th');
    if (firstCell) {
      const newRange = document.createRange();
      newRange.selectNodeContents(firstCell);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setPos(null);
    setShowGridPicker(false);

    // Dispatch input event to trigger syncContent in Editor
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, [editorRef]);

  // Listen for selection changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onSelect = () => setTimeout(showAtSelection, 0);
    const onMouseUp = () => setTimeout(showAtSelection, 10);

    document.addEventListener('selectionchange', onSelect);
    editor.addEventListener('mouseup', onMouseUp);
    editor.addEventListener('keyup', onSelect);
    return () => {
      document.removeEventListener('selectionchange', onSelect);
      editor.removeEventListener('mouseup', onMouseUp);
      editor.removeEventListener('keyup', onSelect);
    };
  }, [editorRef, showAtSelection]);

  // Hide when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const toolbarHit = toolbarRef.current?.contains(e.target as Node);
      const gridPickerHit = gridPickerRef.current?.contains(e.target as Node);
      const editorHit = e.target === editorRef.current || editorRef.current?.contains(e.target as Node);

      if (!toolbarHit && !gridPickerHit) {
        setPos(null);
        setShowGridPicker(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [editorRef]);

  if (!pos) return null;

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()}
    >
      <button className="ft-btn" onClick={() => execCmd('bold')} title="粗体">
        <b>B</b>
      </button>
      <button className="ft-btn" onClick={() => execCmd('italic')} title="斜体">
        <i>I</i>
      </button>
      <button className="ft-btn ft-btn--wiki" onClick={handleWikiLink} title="WikiLink 双向链接">
        W
      </button>
      <button className="ft-btn" onClick={handleInlineCode} title="行内代码">
        {'</>'}
      </button>
      <button
        className="ft-btn"
        onClick={() => setShowGridPicker(prev => !prev)}
        title="插入表格"
      >
        T
      </button>

      {/* Grid picker dropdown */}
      {showGridPicker && (
        <div className="grid-picker-dropdown" ref={gridPickerRef}>
          <div className="grid-picker-label">
            {gridPickerSize.rows} &times; {gridPickerSize.cols}
          </div>
          <div className="grid-picker-grid">
            {Array.from({ length: 10 }, (_, ri) => (
              <div className="grid-picker-row" key={ri}>
                {Array.from({ length: 10 }, (_, ci) => (
                  <div
                    className={
                      'grid-picker-cell' +
                      (ri < gridPickerSize.rows && ci < gridPickerSize.cols
                        ? ' grid-picker-cell--active'
                        : '')
                    }
                    key={ci}
                    onMouseEnter={() => setGridPickerSize({ rows: ri + 1, cols: ci + 1 })}
                    onClick={() => insertTable(ri + 1, ci + 1)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingToolbar;
