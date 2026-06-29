/**
 * noteUtils.ts
 * Pure functions for note file tree, search, tags, and WikiLink parsing.
 * All functions are stateless and side-effect-free — suitable for unit testing.
 */

import type { FileTreeNode, SearchResult } from '../types';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mtime: number;
}

// ─── File Tree ───────────────────────────────────────────────────────────────

/**
 * Build a hierarchical file tree from a flat list of note IDs.
 * Notes whose id contains "/" are nested under folder nodes.
 */
export function buildFileTree(notes: NoteItem[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  notes.forEach(note => {
    const parts = note.id.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');
      let existing = currentLevel.find(item => item.name === part);

      if (!existing) {
        existing = {
          name: part.endsWith('.md') ? part.slice(0, -3) : part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
        };
        if (!isFile) {
          existing.children = [];
        }
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    });
  });

  sortTree(root);
  return root;
}

function sortTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  nodes.forEach(node => {
    if (node.children) sortTree(node.children);
  });
}

// ─── Tags ────────────────────────────────────────────────────────────────────

/**
 * Aggregate all tags from a note collection, returning tag + count pairs
 * sorted by count descending.
 */
export function aggregateTags(notes: NoteItem[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  notes.forEach(note => {
    note.tags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/**
 * Filter notes by a specific tag. Returns notes that include the tag.
 */
export function filterNotesByTag(notes: NoteItem[], tag: string): NoteItem[] {
  return notes.filter(note => note.tags.includes(tag));
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Full-text search across title, content, and tags.
 * Supports "#tag" prefix for tag-only queries.
 * Returns results sorted by relevance score (descending).
 */
export function searchNotes(notes: NoteItem[], query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Tag-only query: "#架构"
  if (trimmed.startsWith('#')) {
    const tagQuery = trimmed.slice(1).toLowerCase();
    return notes
      .filter(note => note.tags.some(t => t.toLowerCase().includes(tagQuery)))
      .map(note => ({
        id: note.id,
        title: note.title,
        path: note.id,
        snippet: note.content.slice(0, 80).replace(/\n/g, ' ') + '...',
        score: 2,
        tags: note.tags,
      }));
  }

  const q = trimmed.toLowerCase();
  const results: SearchResult[] = [];

  notes.forEach(note => {
    const inTitle = note.title.toLowerCase().includes(q);
    const inContent = note.content.toLowerCase().includes(q);
    const inTags = note.tags.some(t => t.toLowerCase().includes(q));

    if (!inTitle && !inContent && !inTags) return;

    let snippet = '';
    if (inContent) {
      const index = note.content.toLowerCase().indexOf(q);
      const start = Math.max(0, index - 20);
      const end = Math.min(note.content.length, index + q.length + 30);
      snippet = '...' + note.content.slice(start, end).replace(/\n/g, ' ') + '...';
    } else {
      snippet = note.content.slice(0, 80).replace(/\n/g, ' ') + '...';
    }

    results.push({
      id: note.id,
      title: note.title,
      path: note.id,
      snippet,
      score: inTitle ? 3 : inTags ? 2 : 1,
      tags: note.tags,
    });
  });

  return results.sort((a, b) => b.score - a.score);
}

// ─── WikiLink ─────────────────────────────────────────────────────────────────

/**
 * Extract all WikiLink targets (`[[target]]`) from a markdown string.
 * Returns an array of unique raw link texts (without the brackets).
 */
export function extractWikiLinks(markdown: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    if (!links.includes(match[1])) {
      links.push(match[1]);
    }
  }
  return links;
}

/**
 * Find all notes that contain a WikiLink pointing to the given note.
 * Used for backlink computation.
 */
export function findBacklinks(notes: NoteItem[], targetNoteId: string): NoteItem[] {
  // Normalise: strip ".md" to get the base name used in [[links]]
  const baseName = targetNoteId.endsWith('.md')
    ? targetNoteId.slice(0, -3)
    : targetNoteId;

  return notes.filter(note => {
    if (note.id === targetNoteId) return false;
    return note.content.includes(`[[${baseName}]]`);
  });
}

/**
 * Replace [[WikiLink]] syntax in raw HTML with <a> tags.
 * `existsCheck` determines whether to mark links as "exists" or "missing".
 */
export function replaceWikiLinks(
  html: string,
  existsCheck: (linkText: string) => boolean
): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_match, linkText: string) => {
    const targetNoteId = linkText.endsWith('.md') ? linkText : `${linkText}.md`;
    const exists = existsCheck(linkText);
    return `<a href="#" class="wikilink ${exists ? 'exists' : 'missing'}" data-target="${targetNoteId}">${linkText}</a>`;
  });
}

// ─── Conflict helpers ─────────────────────────────────────────────────────────

/**
 * Produce a simple "<<< / === / >>>" merge marker string from two content
 * versions. This is a naive, line-level mock of three-way merging.
 */
export function mergeConflict(localContent: string, diskContent: string): string {
  const localLines = localContent.split('\n');
  const diskLines = diskContent.split('\n');
  return [
    '<<<<<<< 本地修改版本',
    ...localLines,
    '======= 网盘最新修改',
    ...diskLines,
    '>>>>>>> 冲突自动对齐结束',
  ].join('\n');
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Format a Unix-millisecond timestamp as a human-readable Chinese locale string.
 * Returns "无" for timestamp 0.
 */
export function formatMtime(ts: number): string {
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
}

/**
 * Compute a search-relevance score for a single note.
 * title match = 3, tag match = 2, content match = 1, no match = 0.
 */
export function scoreNote(note: NoteItem, query: string): number {
  const q = query.toLowerCase();
  if (note.title.toLowerCase().includes(q)) return 3;
  if (note.tags.some(t => t.toLowerCase().includes(q))) return 2;
  if (note.content.toLowerCase().includes(q)) return 1;
  return 0;
}
