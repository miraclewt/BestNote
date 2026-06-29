import React, { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import type { MockNote } from '../data/mockData';
import { findBacklinks, replaceWikiLinks } from '../utils/noteUtils';
import './Preview.css';

interface PreviewProps {
  noteId: string | null;
  content: string;
  notes: MockNote[];
  setActiveNoteId: (id: string) => void;
}

// Initialize Mermaid once for the lifetime of the app
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

export const Preview: React.FC<PreviewProps> = ({
  noteId,
  content,
  notes,
  setActiveNoteId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute backlinks for the active note
  const backlinks = useMemo(
    () => (noteId ? findBacklinks(notes, noteId) : []),
    [noteId, notes]
  );

  // Configure marked options
  marked.setOptions({ gfm: true, breaks: true });

  // Render markdown → replace WikiLinks → DOMPurify sanitize
  const htmlContent = useMemo(() => {
    // Replace mermaid code fences with placeholder <div class="mermaid"> before
    // passing to marked so that marked doesn't escape them.
    const mermaidPrepped = content.replace(
      /```mermaid\n([\s\S]*?)```/g,
      (_match, diagram: string) => {
        const escaped = diagram.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="mermaid" data-raw="${encodeURIComponent(diagram.trim())}">${escaped}</div>`;
      }
    );

    let rawHtml = marked.parse(mermaidPrepped) as string;

    // Replace WikiLink syntax
    rawHtml = replaceWikiLinks(rawHtml, (linkText: string) => {
      const targetId = linkText.endsWith('.md') ? linkText : `${linkText}.md`;
      return notes.some(
        n =>
          n.id.toLowerCase() === targetId.toLowerCase() ||
          n.title.toLowerCase() === linkText.toLowerCase()
      );
    });

    // Sanitize while allowing mermaid divs and data attributes
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span', 'div', 'ul', 'ol', 'li',
        'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'strong', 'em', 'del', 'img', 'input',
      ],
      ALLOWED_ATTR: [
        'href', 'class', 'data-target', 'data-raw', 'src', 'alt', 'type', 'checked', 'disabled',
      ],
    });
  }, [content, notes]);

  // After DOM update, run Mermaid on any .mermaid divs in the preview
  useEffect(() => {
    if (!containerRef.current) return;

    const mermaidDivs = containerRef.current.querySelectorAll<HTMLDivElement>('.mermaid');
    if (mermaidDivs.length === 0) return;

    mermaidDivs.forEach((div, i) => {
      // Only render if not already rendered
      if (div.getAttribute('data-mermaid-rendered')) return;
      div.setAttribute('data-mermaid-rendered', 'true');

      const raw = decodeURIComponent(div.getAttribute('data-raw') || '');
      if (!raw) return;

      const id = `mermaid-${Date.now()}-${i}`;
      mermaid.render(id, raw).then(({ svg }) => {
        div.innerHTML = svg;
      }).catch(err => {
        div.textContent = `Mermaid render error: ${err}`;
        div.style.color = 'red';
      });
    });
  }, [htmlContent]);

  // Intercept clicks on wikilinks — stop propagation to avoid entering source mode
  const handleHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.classList.contains('wikilink')) {
      e.preventDefault();
      e.stopPropagation();
      const targetNoteId = target.getAttribute('data-target');
      if (targetNoteId) {
        const matchingNote = notes.find(
          n =>
            n.id.toLowerCase() === targetNoteId.toLowerCase() ||
            n.title.toLowerCase() === targetNoteId.slice(0, -3).toLowerCase()
        );
        if (matchingNote) {
          setActiveNoteId(matchingNote.id);
        } else {
          alert(`目标笔记 "${targetNoteId.slice(0, -3)}" 不存在，您可以通过侧边栏新建或创建该文件。`);
        }
      }
    }
  };

  if (!noteId) {
    return (
      <div className="preview-empty">
        <div className="empty-state">
          <h3>打开笔记开始预览</h3>
          <p>从左侧文件树选择任意 Markdown 文档进行实时渲染。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      {/* HTML Render Area */}
      <div
        ref={containerRef}
        className="preview-body markdown-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onClick={handleHtmlClick}
      />

      {/* Backlinks Section */}
      <div className="preview-backlinks">
        <div className="backlinks-header">
          反向链接 ({backlinks.length})
        </div>
        {backlinks.length > 0 ? (
          <div className="backlinks-list">
            {backlinks.map(note => (
              <div
                key={note.id}
                className="backlink-item"
                onClick={(e) => { e.stopPropagation(); setActiveNoteId(note.id); }}
              >
                <span className="backlink-title">{note.title}</span>
                <span className="backlink-snippet">
                  {note.content.split('\n').find(line => line.includes('[['))?.slice(0, 50) + '...'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="backlinks-empty">没有其他笔记引用此文档。</div>
        )}
      </div>
    </div>
  );
};
export default Preview;
