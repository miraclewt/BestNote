import React, { useEffect, useRef, useState } from 'react';
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

  const showAtSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPos({
      top: rect.top - 40 + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    showAtSelection();
  };

  const handleWikiLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text = range.toString() || '链接';
    // Prompt for target
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
  }, [editorRef]);

  // Hide when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        e.target !== editorRef.current &&
        !editorRef.current?.contains(e.target as Node)
      ) {
        setPos(null);
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
    </div>
  );
};

export default FloatingToolbar;
