/**
 * TableToolbar.test.tsx
 * Tests for TableToolbar — contextual table editing operations.
 */

import React, { useRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TableToolbar } from './TableToolbar';

// Wrapper with a contenteditable div containing a table
const Wrapper: React.FC<{ tableHTML?: string }> = ({
  tableHTML = `<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>`,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div
        ref={editorRef}
        data-testid="editor"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: tableHTML }}
      />
      <TableToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
};

// Place cursor inside a cell and trigger selectionchange + timers to show toolbar
function focusAndShow(cell: HTMLTableCellElement) {
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);

  document.dispatchEvent(new Event('selectionchange'));
}

// Attach input spy to editor
function spyInput(editor: HTMLElement) {
  const handler = vi.fn();
  editor.addEventListener('input', handler);
  return handler;
}

describe('TableToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.getSelection()?.removeAllRanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Visibility ───

  it('should not render when cursor is outside a table', () => {
    render(
      <div>
        <div data-testid="editor" contentEditable suppressContentEditableWarning>
          Plain text no table
        </div>
        <TableToolbar editorRef={{ current: null } as any} />
      </div>
    );
    expect(screen.queryByTitle('上方插入行')).toBeNull();
  });

  it('should not render when cursor in plain text without table', () => {
    const PlainWrapper: React.FC = () => {
      const editorRef = useRef<HTMLDivElement>(null);
      return (
        <div>
          <div
            ref={editorRef}
            data-testid="editor"
            contentEditable
            suppressContentEditableWarning
          >
            Just some text
          </div>
          <TableToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
        </div>
      );
    };

    render(<PlainWrapper />);
    const editor = screen.getByTestId('editor');
    const textNode = editor.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 3);
    range.setEnd(textNode, 8);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    act(() => {
      vi.advanceTimersByTime(10);
    });

    // No table ancestor → no toolbar
    expect(screen.queryByTitle('上方插入行')).toBeNull();
  });

  it('should render all toolbar buttons when cursor is inside a table cell', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    const cell = editor.querySelector('td')!;
    focusAndShow(cell);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('上方插入行')).toBeInTheDocument();
    expect(screen.getByTitle('下方插入行')).toBeInTheDocument();
    expect(screen.getByTitle('左侧插入列')).toBeInTheDocument();
    expect(screen.getByTitle('右侧插入列')).toBeInTheDocument();
    expect(screen.getByTitle('删除行')).toBeInTheDocument();
    expect(screen.getByTitle('删除列')).toBeInTheDocument();
    expect(screen.getByTitle('删除表格')).toBeInTheDocument();
  });

  it('should render when cursor is inside a th cell', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    const cell = editor.querySelector('th')!;
    focusAndShow(cell);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('上方插入行')).toBeInTheDocument();
  });

  // ─── Row operations ───

  describe('addRowAbove', () => {
    it('should insert a row above the current row', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[2]!; // "3" — first cell of 2nd body row
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('上方插入行'));

      // header(1) + tbody(3) = 4 rows
      const rows = editor.querySelectorAll('tr');
      expect(rows.length).toBe(4);
      const tbody = editor.querySelector('tbody')!;
      expect(tbody.children.length).toBe(3);
    });

    it('should clear content of new cells to zero-width space', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[2]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('上方插入行'));

      const tbody = editor.querySelector('tbody')!;
      const newRow = tbody.children[1] as HTMLTableRowElement;
      Array.from(newRow.cells).forEach(c => {
        expect(c.innerHTML).toBe('​');
      });
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[2]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('上方插入行'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('addRowBelow', () => {
    it('should insert a row below', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('下方插入行'));

      expect(editor.querySelectorAll('tr').length).toBe(4);
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('下方插入行'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('deleteRow', () => {
    it('should remove the current row', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[2]!;
      focusAndShow(cell);

      expect(editor.querySelectorAll('tr').length).toBe(3);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除行'));

      expect(editor.querySelectorAll('tr').length).toBe(2);
    });

    it('should delete table when deleting the only row', () => {
      const SingleRowWrapper: React.FC = () => {
        const editorRef = useRef<HTMLDivElement>(null);
        return (
          <div>
            <div
              ref={editorRef}
              data-testid="editor"
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{
                __html: '<table><thead><tr><th>Only</th></tr></thead><tbody></tbody></table>',
              }}
            />
            <TableToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
          </div>
        );
      };

      render(<SingleRowWrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelector('th')!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除行'));

      expect(editor.querySelector('table')).toBeNull();
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[2]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除行'));
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── Column operations ───

  describe('addColumnLeft', () => {
    it('should insert a column to the left', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[1]!; // second column "2"
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('左侧插入列'));

      const rows = editor.querySelectorAll('tr');
      rows.forEach(row => {
        expect(row.cells.length).toBe(3);
      });
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('左侧插入列'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('addColumnRight', () => {
    it('should insert a column to the right', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('右侧插入列'));

      const rows = editor.querySelectorAll('tr');
      rows.forEach(row => {
        expect(row.cells.length).toBe(3);
      });
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('右侧插入列'));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('deleteColumn', () => {
    it('should remove the current column', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelectorAll('td')[1]!; // second column
      focusAndShow(cell);

      expect(editor.querySelector('tr')!.cells.length).toBe(2);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除列'));

      const rows = editor.querySelectorAll('tr');
      rows.forEach(row => {
        expect(row.cells.length).toBe(1);
      });
    });

    it('should delete table when deleting the only column', () => {
      const SingleColWrapper: React.FC = () => {
        const editorRef = useRef<HTMLDivElement>(null);
        return (
          <div>
            <div
              ref={editorRef}
              data-testid="editor"
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{
                __html: '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
              }}
            />
            <TableToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />
          </div>
        );
      };

      render(<SingleColWrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelector('th')!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除列'));

      expect(editor.querySelector('table')).toBeNull();
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelectorAll('td')[0]!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除列'));
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── Delete table ───

  describe('deleteTable', () => {
    it('should remove the entire table', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const cell = editor.querySelector('td')!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除表格'));

      expect(editor.querySelector('table')).toBeNull();
    });

    it('should dispatch input event', () => {
      render(<Wrapper />);
      const editor = screen.getByTestId('editor');
      const handler = spyInput(editor);
      const cell = editor.querySelector('td')!;
      focusAndShow(cell);

      act(() => {
        vi.advanceTimersByTime(10);
      });

      fireEvent.click(screen.getByTitle('删除表格'));
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── Styling ───

  it('should have danger class on delete buttons', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    const cell = editor.querySelector('td')!;
    focusAndShow(cell);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByTitle('删除行').classList.contains('tt-btn--danger')).toBe(true);
    expect(screen.getByTitle('删除列').classList.contains('tt-btn--danger')).toBe(true);
    expect(screen.getByTitle('删除表格').classList.contains('tt-btn--danger')).toBe(true);
  });

  it('should render dividers between groups', () => {
    render(<Wrapper />);
    const editor = screen.getByTestId('editor');
    const cell = editor.querySelector('td')!;
    focusAndShow(cell);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    const dividers = document.querySelectorAll('.tt-divider');
    expect(dividers.length).toBe(2);
  });
});
