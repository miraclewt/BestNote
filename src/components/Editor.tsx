import React, { useRef, useEffect, useCallback, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { FloatingToolbar } from './FloatingToolbar';
import { replaceWikiLinks } from '../utils/noteUtils';
import './Editor.css';

interface EditorProps {
  content: string;
  onContentChange: (val: string) => void;
  isDirty: boolean;
  openMtime: number;
  onSave: () => void;
  setActiveNoteId: (id: string) => void;
}

// Turndown instance — singleton
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.addRule('wikilink', {
  filter: (node) =>
    node instanceof HTMLElement &&
    node.tagName === 'A' &&
    node.classList.contains('wikilink'),
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const target = el.getAttribute('data-target') || el.textContent || '';
    return `[[${target}]]`;
  },
});

// Markdown → clean HTML
const renderHTML = (md: string): string => {
  const rawHtml = marked.parse(md, { gfm: true, breaks: true }) as string;
  const withLinks = replaceWikiLinks(rawHtml, () => true);
  return DOMPurify.sanitize(withLinks, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span', 'div', 'ul', 'ol', 'li',
      'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'strong', 'em', 'del', 'img', 'input', 'br',
    ],
    ALLOWED_ATTR: ['href', 'class', 'data-target', 'src', 'alt', 'type', 'checked', 'disabled'],
  });
};

// HTML → Markdown via turndown
const toMarkdown = (html: string): string => {
  return turndown.turndown(html);
};

export const Editor: React.FC<EditorProps> = ({
  content,
  onContentChange,
  isDirty,
  openMtime,
  onSave,
  setActiveNoteId,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ chars: 0, lines: 0 });

  // Sync rendered HTML into contenteditable ONLY when note changes (openMtime)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = renderHTML(content);
      setStats({
        chars: editorRef.current.textContent?.length ?? 0,
        lines: editorRef.current.innerText?.split('\n').length ?? 0,
      });
    }
  }, [openMtime]);

  // Convert HTML→Markdown + sync to store
  const syncContent = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const md = toMarkdown(html);
    onContentChange(md);
    setStats({
      chars: editorRef.current.textContent?.length ?? 0,
      lines: editorRef.current.innerText?.split('\n').length ?? 0,
    });
  }, [onContentChange]);

  // Ctrl+S handler inside editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        syncContent();
        // Let React flush state, then call save
        setTimeout(() => onSave(), 0);
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [syncContent, onSave]);

  // Mark dirty on input
  const handleInput = useCallback(() => {
    syncContent();
  }, [syncContent]);

  // WikiLink Ctrl+Click navigation
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.classList.contains('wikilink') && e.ctrlKey) {
      e.preventDefault();
      const noteId = target.getAttribute('data-target');
      if (noteId) setActiveNoteId(noteId);
    }
  }, [setActiveNoteId]);

  const getFormattedMtime = (ts: number) => {
    if (ts === 0) return '无';
    return new Date(ts).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="editor-container">
      <FloatingToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />

      {/* WYSIWYG contenteditable area */}
      <div
        ref={editorRef}
        className="editor-wysiwyg markdown-body"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        spellCheck={false}
      />

      {/* Footer */}
      <div className="editor-footer">
        <div className="footer-left">
          <span>打开时间: <code className="mtime-code">{getFormattedMtime(openMtime)}</code></span>
          {isDirty && <span className="dirty-badge">未保存</span>}
        </div>
        <div className="footer-right">
          <span>{stats.chars} 字符</span>
          <span>{stats.lines} 行</span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
