/**
 * noteUtils.test.ts
 * Unit tests for all pure functions in src/utils/noteUtils.ts
 */

import { describe, it, expect } from 'vitest';
import {
  buildFileTree,
  aggregateTags,
  filterNotesByTag,
  searchNotes,
  extractWikiLinks,
  findBacklinks,
  replaceWikiLinks,
  mergeConflict,
  formatMtime,
  scoreNote,
} from '../utils/noteUtils';
import type { NoteItem } from '../utils/noteUtils';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const notes: NoteItem[] = [
  {
    id: '项目概述.md',
    title: '项目概述',
    content: '# 项目概述\n欢迎使用，请查看 [[API设计文档]] 了解接口详情。',
    tags: ['指南', '概述'],
    mtime: 1000,
  },
  {
    id: 'API设计文档.md',
    title: 'API设计文档',
    content: '# API 设计\n参考 [[项目概述]] 了解背景。\n接口说明见 [[技术方案/数据库设计]]。',
    tags: ['技术', 'API', '开发'],
    mtime: 2000,
  },
  {
    id: '技术方案/数据库设计.md',
    title: '数据库设计',
    content: '# 数据库设计\n关系映射参考 [[API设计文档]]。',
    tags: ['技术', '数据库', '开发'],
    mtime: 3000,
  },
  {
    id: '学习笔记/Rust入门.md',
    title: 'Rust入门',
    content: '# Rust 入门\n所有权是 Rust 的核心概念。',
    tags: ['学习', 'Rust'],
    mtime: 4000,
  },
];

// ─── buildFileTree ────────────────────────────────────────────────────────────

describe('buildFileTree', () => {
  it('should produce root-level file nodes', () => {
    const tree = buildFileTree(notes);
    const rootFiles = tree.filter(n => n.type === 'file');
    expect(rootFiles.length).toBe(2); // 项目概述, API设计文档
  });

  it('should produce folder nodes for nested notes', () => {
    const tree = buildFileTree(notes);
    const folders = tree.filter(n => n.type === 'folder');
    expect(folders.length).toBe(2); // 技术方案, 学习笔记
  });

  it('should strip .md from file node names', () => {
    const tree = buildFileTree(notes);
    const file = tree.find(n => n.type === 'file' && n.name === '项目概述');
    expect(file).toBeDefined();
  });

  it('should nest children under folders', () => {
    const tree = buildFileTree(notes);
    const techFolder = tree.find(n => n.name === '技术方案');
    expect(techFolder?.children?.length).toBe(1);
    expect(techFolder?.children?.[0]?.name).toBe('数据库设计');
  });

  it('should sort folders before files', () => {
    const tree = buildFileTree(notes);
    const types = tree.map(n => n.type);
    const lastFolderIdx = types.lastIndexOf('folder');
    const firstFileIdx = types.indexOf('file');
    expect(lastFolderIdx).toBeLessThan(firstFileIdx);
  });

  it('should handle empty input', () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it('should set path correctly for nested nodes', () => {
    const tree = buildFileTree(notes);
    const techFolder = tree.find(n => n.name === '技术方案');
    expect(techFolder?.path).toBe('技术方案');
    expect(techFolder?.children?.[0]?.path).toBe('技术方案/数据库设计.md');
  });
});

// ─── aggregateTags ────────────────────────────────────────────────────────────

describe('aggregateTags', () => {
  it('should count tags across all notes', () => {
    const tags = aggregateTags(notes);
    const tech = tags.find(t => t.tag === '技术');
    expect(tech?.count).toBe(2);
  });

  it('should return unique tags', () => {
    const tags = aggregateTags(notes);
    const tagNames = tags.map(t => t.tag);
    expect(new Set(tagNames).size).toBe(tagNames.length);
  });

  it('should sort by count descending', () => {
    const tags = aggregateTags(notes);
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i - 1].count).toBeGreaterThanOrEqual(tags[i].count);
    }
  });

  it('should return empty array for empty input', () => {
    expect(aggregateTags([])).toEqual([]);
  });

  it('should return empty array for notes with no tags', () => {
    const noTagNotes: NoteItem[] = [{ id: 'a.md', title: 'A', content: '', tags: [], mtime: 0 }];
    expect(aggregateTags(noTagNotes)).toEqual([]);
  });
});

// ─── filterNotesByTag ─────────────────────────────────────────────────────────

describe('filterNotesByTag', () => {
  it('should return only notes with the given tag', () => {
    const result = filterNotesByTag(notes, '技术');
    expect(result.map(n => n.id)).toContain('API设计文档.md');
    expect(result.map(n => n.id)).toContain('技术方案/数据库设计.md');
    expect(result.map(n => n.id)).not.toContain('项目概述.md');
  });

  it('should return empty array when tag is not found', () => {
    expect(filterNotesByTag(notes, '不存在的标签')).toEqual([]);
  });

  it('should be case-sensitive', () => {
    expect(filterNotesByTag(notes, 'rust')).toEqual([]);
    expect(filterNotesByTag(notes, 'Rust').length).toBe(1);
  });
});

// ─── searchNotes ──────────────────────────────────────────────────────────────

describe('searchNotes', () => {
  it('should return empty array for empty query', () => {
    expect(searchNotes(notes, '')).toEqual([]);
    expect(searchNotes(notes, '   ')).toEqual([]);
  });

  it('should find notes by title', () => {
    const results = searchNotes(notes, '项目概述');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('项目概述.md');
  });

  it('should find notes by content keyword', () => {
    const results = searchNotes(notes, '所有权');
    expect(results.some(r => r.id === '学习笔记/Rust入门.md')).toBe(true);
  });

  it('should find notes by tag keyword', () => {
    const results = searchNotes(notes, 'Rust');
    expect(results.some(r => r.tags.includes('Rust'))).toBe(true);
  });

  it('should handle tag-prefix query "#tag"', () => {
    const results = searchNotes(notes, '#技术');
    expect(results.every(r => r.tags.some(t => t.toLowerCase().includes('技术')))).toBe(true);
  });

  it('title match should score higher than content match', () => {
    const results = searchNotes(notes, 'API');
    const titleMatch = results.find(r => r.id === 'API设计文档.md');
    const contentMatch = results.find(r => r.id !== 'API设计文档.md');
    if (titleMatch && contentMatch) {
      expect(titleMatch.score).toBeGreaterThanOrEqual(contentMatch.score);
    }
  });

  it('should be case-insensitive', () => {
    const upper = searchNotes(notes, 'RUST');
    const lower = searchNotes(notes, 'rust');
    expect(upper.map(r => r.id)).toEqual(lower.map(r => r.id));
  });

  it('snippet should contain the search term', () => {
    const results = searchNotes(notes, '所有权');
    const r = results.find(r => r.id === '学习笔记/Rust入门.md');
    expect(r?.snippet).toContain('所有权');
  });
});

// ─── extractWikiLinks ─────────────────────────────────────────────────────────

describe('extractWikiLinks', () => {
  it('should extract single wikilinks', () => {
    expect(extractWikiLinks('请查看 [[项目概述]]')).toEqual(['项目概述']);
  });

  it('should extract multiple wikilinks', () => {
    const links = extractWikiLinks('参考 [[A]] 和 [[B]]');
    expect(links).toContain('A');
    expect(links).toContain('B');
  });

  it('should extract path-style wikilinks', () => {
    expect(extractWikiLinks('查看 [[技术方案/数据库设计]]')).toEqual(['技术方案/数据库设计']);
  });

  it('should deduplicate duplicate wikilinks', () => {
    const links = extractWikiLinks('[[A]] [[A]] [[B]]');
    expect(links.filter(l => l === 'A').length).toBe(1);
  });

  it('should return empty array when no wikilinks', () => {
    expect(extractWikiLinks('plain text without links')).toEqual([]);
  });

  it('should not match incomplete brackets', () => {
    expect(extractWikiLinks('[单括号]')).toEqual([]);
    expect(extractWikiLinks('[[未闭合')).toEqual([]);
  });
});

// ─── findBacklinks ────────────────────────────────────────────────────────────

describe('findBacklinks', () => {
  it('should find notes that contain [[targetBaseName]]', () => {
    const backlinks = findBacklinks(notes, 'API设计文档.md');
    const ids = backlinks.map(n => n.id);
    expect(ids).toContain('项目概述.md');
    expect(ids).toContain('技术方案/数据库设计.md');
  });

  it('should not include the note itself', () => {
    const backlinks = findBacklinks(notes, '项目概述.md');
    expect(backlinks.some(n => n.id === '项目概述.md')).toBe(false);
  });

  it('should return empty array when no backlinks exist', () => {
    const isolated: NoteItem[] = [{ id: 'a.md', title: 'A', content: 'no links here', tags: [], mtime: 0 }];
    expect(findBacklinks(isolated, 'a.md')).toEqual([]);
  });

  it('should work without .md suffix', () => {
    const backlinks = findBacklinks(notes, 'API设计文档');
    expect(backlinks.length).toBeGreaterThan(0);
  });
});

// ─── replaceWikiLinks ─────────────────────────────────────────────────────────

describe('replaceWikiLinks', () => {
  it('should replace [[link]] with an <a> tag', () => {
    const html = replaceWikiLinks('查看 [[项目概述]]', () => true);
    expect(html).toContain('<a');
    expect(html).toContain('class="wikilink exists"');
    expect(html).toContain('data-target="项目概述.md"');
    expect(html).toContain('>项目概述</a>');
  });

  it('should add "missing" class when note does not exist', () => {
    const html = replaceWikiLinks('[[不存在]]', () => false);
    expect(html).toContain('class="wikilink missing"');
  });

  it('should not modify text without wikilinks', () => {
    const plain = '没有链接的文本';
    expect(replaceWikiLinks(plain, () => true)).toBe(plain);
  });

  it('should append .md to target if missing', () => {
    const html = replaceWikiLinks('[[Note]]', () => true);
    expect(html).toContain('data-target="Note.md"');
  });

  it('should not double-append .md if already present', () => {
    const html = replaceWikiLinks('[[Note.md]]', () => true);
    expect(html).toContain('data-target="Note.md"');
    expect(html).not.toContain('data-target="Note.md.md"');
  });
});

// ─── mergeConflict ────────────────────────────────────────────────────────────

describe('mergeConflict', () => {
  it('should contain conflict markers', () => {
    const merged = mergeConflict('local', 'disk');
    expect(merged).toContain('<<<<<<<');
    expect(merged).toContain('=======');
    expect(merged).toContain('>>>>>>>');
  });

  it('should contain both local and disk content', () => {
    const merged = mergeConflict('本地内容', '网盘内容');
    expect(merged).toContain('本地内容');
    expect(merged).toContain('网盘内容');
  });

  it('should handle empty inputs without error', () => {
    expect(() => mergeConflict('', '')).not.toThrow();
  });

  it('should handle multiline content', () => {
    const merged = mergeConflict('line1\nline2', 'lineA\nlineB');
    expect(merged).toContain('line1');
    expect(merged).toContain('lineA');
  });
});

// ─── formatMtime ─────────────────────────────────────────────────────────────

describe('formatMtime', () => {
  it('should return "无" for ts=0', () => {
    expect(formatMtime(0)).toBe('无');
  });

  it('should return a non-empty string for non-zero timestamps', () => {
    const result = formatMtime(1719662000000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include year, month, day components', () => {
    const result = formatMtime(new Date('2024-06-01T12:00:00Z').getTime());
    expect(result).toMatch(/202[0-9]/); // Contains a year
  });
});

// ─── scoreNote ────────────────────────────────────────────────────────────────

describe('scoreNote', () => {
  const note: NoteItem = {
    id: 'test.md',
    title: '测试笔记',
    content: '这是一段关于Rust的内容',
    tags: ['学习', 'Rust'],
    mtime: 0,
  };

  it('should return 3 for title match', () => {
    expect(scoreNote(note, '测试')).toBe(3);
  });

  it('should return 2 for tag match', () => {
    // "Rust" is in tags, but title "测试笔记" doesn't contain "Rust" → tag match → 2
    expect(scoreNote(note, 'Rust')).toBe(2);
  });

  it('should return 2 for tag-only match', () => {
    expect(scoreNote(note, '学习')).toBe(2);
  });

  it('should return 1 for content-only match', () => {
    expect(scoreNote(note, '一段')).toBe(1);
  });

  it('should return 0 for no match', () => {
    expect(scoreNote(note, '不存在的词')).toBe(0);
  });

  it('should be case-insensitive for ASCII', () => {
    expect(scoreNote(note, 'rust')).toBeGreaterThan(0);
  });
});
