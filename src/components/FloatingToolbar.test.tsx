/**
 * FloatingToolbar.test.tsx
 * Tests for FloatingToolbar — table insert and grid picker.
 */

import React, { useRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FloatingToolbar } from './FloatingToolbar';

// Wrapper that provides a contenteditable div + FloatingToolbar with ref
const Wrapper: React.FC<{ initialContent?: string }> = ({ initialContent = 'Hello World' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div
        ref={editorRef}
        data-testid="editor"
        contentEditable
        suppressContentEditableWarning
      >
        {initialContent}
      </div>
      <FloatingToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
};

// Select text inside editor and trigger selectionchange + timers to show toolbar
function selectAndShow(editor: HTMLElement, startOffset = 0, endOffset?: number) {
  const textNode = editor.firstChild;
  if (!textNode) return;

  const range = document.createRange();
  const end = endOffset ?? editor.textContent?.length ?? 0;
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, end);

  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);

  // Dispatch selectionchange to trigger the toolbar's listener
  document.dispatchEvent(new Event('selectionchange'));
}

describe('FloatingToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Toolbar visibility ───

  it('should not render toolbar when no selection', () => {
    render(<Wrapper />);
    expect(screen.queryByTitle('粗体')).toBeNull();
    expect(screen.queryByTitle('插入表格')).toBeNull();
  });

  it('should render toolbar with all buttons when text is selected', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('粗体')).toBeInTheDocument();
    expect(screen.getByTitle('斜体')).toBeInTheDocument();
    expect(screen.getByTitle('WikiLink 双向链接')).toBeInTheDocument();
    expect(screen.getByTitle('行内代码')).toBeInTheDocument();
    expect(screen.getByTitle('插入表格')).toBeInTheDocument();
  });

  // ─── T button & grid picker ───

  it('should show T button for table insert', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    const tBtn = screen.getByTitle('插入表格');
    expect(tBtn).toBeInTheDocument();
    expect(tBtn.textContent).toBe('T');
  });

  it('should not show grid picker initially', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('插入表格')).toBeInTheDocument();
    expect(screen.queryByText(/×/)).toBeNull();
  });

  it('should open grid picker when T button is clicked', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    // Grid picker label shows "3 × 3" by default
    expect(screen.getByText(/3\s*×\s*3/)).toBeInTheDocument();
  });

  it('should close grid picker when T button is clicked again', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    const tBtn = screen.getByTitle('插入表格');
    fireEvent.click(tBtn);
    expect(screen.getByText(/3\s*×\s*3/)).toBeInTheDocument();

    fireEvent.click(tBtn);
    expect(screen.queryByText(/×/)).toBeNull();
  });

  // ─── Grid picker dimension label ───

  it('should update dimension label on cell hover', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    // Hover cell at row 5, col 4 → should show "5 × 4"
    const rows = document.querySelectorAll('.grid-picker-row');
    expect(rows.length).toBe(10);

    const cell4inRow5 = rows[4].children[3] as HTMLElement;
    fireEvent.mouseEnter(cell4inRow5);

    expect(screen.getByText(/5\s*×\s*4/)).toBeInTheDocument();
  });

  // ─── Grid cells ───

  it('should render 100 grid cells (10x10)', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    const cells = document.querySelectorAll('.grid-picker-cell');
    expect(cells.length).toBe(100);
  });

  it('should highlight cells up to the hovered row/column', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    // Hover cell at row 2, col 3 → 2×3=6 cells highlighted
    const rows = document.querySelectorAll('.grid-picker-row');
    const targetCell = rows[1].children[2] as HTMLElement;
    fireEvent.mouseEnter(targetCell);

    const activeCells = document.querySelectorAll('.grid-picker-cell--active');
    expect(activeCells.length).toBe(6);
  });

  // ─── Table insertion via grid click ───

  it('should insert table into editor on grid cell click', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    // Click cell at row 2 col 2 → 2 rows, 2 cols
    const rows = document.querySelectorAll('.grid-picker-row');
    const cell = rows[1].children[1] as HTMLElement;
    fireEvent.click(cell);

    // Toolbar and grid picker should close
    expect(screen.queryByTitle('插入表格')).toBeNull();

    // Editor should now contain a table
    const table = editor.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.querySelector('thead')).not.toBeNull();
    expect(table!.querySelector('tbody')).not.toBeNull();

    const allRows = table!.querySelectorAll('tr');
    expect(allRows.length).toBe(2);
    expect(allRows[0].cells.length).toBe(2);
  });

  it('should dispatch input event on editor after table insert', () => {
    const handler = vi.fn();

    const WrapperWithSpy: React.FC = () => {
      const editorRef = useRef<HTMLDivElement>(null);

      React.useEffect(() => {
        editorRef.current?.addEventListener('input', handler);
        return () => editorRef.current?.removeEventListener('input', handler);
      }, []);

      return (
        <div>
          <div
            ref={editorRef}
            data-testid="editor"
            contentEditable
            suppressContentEditableWarning
          >
            Hello World
          </div>
          <FloatingToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
        </div>
      );
    };

    render(<WrapperWithSpy />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));

    const rows = document.querySelectorAll('.grid-picker-row');
    const cell = rows[1].children[1] as HTMLElement;
    fireEvent.click(cell);

    expect(handler).toHaveBeenCalled();
  });

  // ─── Close on outside click ───

  it('should close toolbar when clicking outside', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('粗体')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTitle('粗体')).toBeNull();
  });

  it('should close grid picker when clicking outside', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    selectAndShow(editor);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(screen.getByTitle('插入表格'));
    expect(screen.getByText(/×/)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText(/×/)).toBeNull();
  });
});
