/**
 * Sidebar.test.tsx
 * Component tests for the Sidebar panel.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../components/Sidebar';
import type { FileTreeNode, SearchResult } from '../types';
import type { NoteItem } from '../utils/noteUtils';

const fileTree: FileTreeNode[] = [
  { name: '项目概述', path: '项目概述.md', type: 'file' },
  {
    name: '技术方案',
    path: '技术方案',
    type: 'folder',
    children: [
      { name: '数据库设计', path: '技术方案/数据库设计.md', type: 'file' },
    ],
  },
];

const allTags = [
  { tag: '技术', count: 2 },
  { tag: '指南', count: 1 },
];

const tagFilteredNotes: NoteItem[] = [
  { id: 'API设计文档.md', title: 'API设计文档', content: '接口说明', tags: ['技术'], mtime: 0 },
  { id: '技术方案/数据库设计.md', title: '数据库设计', content: '表结构', tags: ['技术'], mtime: 0 },
];

const defaultProps = {
  fileTree,
  activeNoteId: null,
  setActiveNoteId: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  searchResults: [] as SearchResult[],
  allTags,
  selectedTag: null,
  setSelectedTag: vi.fn(),
  tagFilteredNotes: [] as NoteItem[],
};

describe('Sidebar component', () => {
  it('should render the file tree in default state', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('项目概述')).toBeInTheDocument();
    expect(screen.getByText('技术方案')).toBeInTheDocument();
  });

  it('should render all tag cloud items', () => {
    render(<Sidebar {...defaultProps} />);
    // Use exact class-based query to avoid matching the "技术方案" folder name
    const tagPills = document.querySelectorAll('.tag-cloud-item');
    const tagTexts = Array.from(tagPills).map(el => el.textContent ?? '');
    expect(tagTexts.some(t => t.includes('技术'))).toBe(true);
    expect(tagTexts.some(t => t.includes('指南'))).toBe(true);
  });

  it('should show search results when searchQuery is set', () => {
    const results: SearchResult[] = [
      { id: 'API设计文档.md', title: 'API设计文档', path: 'API设计文档.md', snippet: '接口...', score: 3, tags: ['技术'] },
    ];
    render(<Sidebar {...defaultProps} searchQuery="API" searchResults={results} />);
    expect(screen.getByText('搜索结果 (1)')).toBeInTheDocument();
    // Title is rendered with an emoji prefix in a child element
    expect(screen.getByText(/API设计文档/)).toBeInTheDocument();
  });

  it('should show "无匹配笔记" when search has no results', () => {
    render(<Sidebar {...defaultProps} searchQuery="不存在" searchResults={[]} />);
    expect(screen.getByText('无匹配笔记')).toBeInTheDocument();
  });

  it('should call setActiveNoteId when a file node is clicked', () => {
    const setActive = vi.fn();
    render(<Sidebar {...defaultProps} setActiveNoteId={setActive} />);
    fireEvent.click(screen.getByText('项目概述'));
    expect(setActive).toHaveBeenCalledWith('项目概述.md');
  });

  it('should expand/collapse folders when clicked', () => {
    render(<Sidebar {...defaultProps} />);
    // Folder is expanded by default (collapsed state = false)
    expect(screen.getByText('数据库设计')).toBeInTheDocument();
    // Click the folder to collapse it
    fireEvent.click(screen.getByText('技术方案'));
    expect(screen.queryByText('数据库设计')).toBeNull();
  });

  it('should show tag-filtered notes when a tag is selected', () => {
    render(
      <Sidebar
        {...defaultProps}
        selectedTag="技术"
        tagFilteredNotes={tagFilteredNotes}
      />
    );
    expect(screen.getByText(/标签: #技术/)).toBeInTheDocument();
    // result-title elements contain emoji + title; use regex to match
    expect(screen.getByText(/API设计文档/)).toBeInTheDocument();
    expect(screen.getByText(/数据库设计/)).toBeInTheDocument();
  });

  it('should show "该标签下没有笔记" when tag filter is empty', () => {
    render(
      <Sidebar
        {...defaultProps}
        selectedTag="空标签"
        tagFilteredNotes={[]}
      />
    );
    expect(screen.getByText('该标签下没有笔记')).toBeInTheDocument();
  });

  it('should call setSelectedTag and setSearchQuery when clicking a tag', () => {
    const setTag = vi.fn();
    const setQuery = vi.fn();
    render(<Sidebar {...defaultProps} setSelectedTag={setTag} setSearchQuery={setQuery} />);
    // Click directly on the tag pill element (not the folder node which also contains "技术")
    const tagPill = Array.from(document.querySelectorAll('.tag-cloud-item'))
      .find(el => el.textContent?.includes('技术') && !el.textContent?.includes('方案'));
    expect(tagPill).toBeDefined();
    fireEvent.click(tagPill!);
    expect(setTag).toHaveBeenCalledWith('技术');
    // search query should be cleared when switching to tag filter
    expect(setQuery).toHaveBeenCalledWith('');
  });

  it('should call setSelectedTag(null) when clicking active tag again (toggle off)', () => {
    const setTag = vi.fn();
    render(<Sidebar {...defaultProps} selectedTag="技术" setSelectedTag={setTag} />);
    // The active tag pill
    const activePill = document.querySelector('.tag-cloud-item.active');
    if (activePill) fireEvent.click(activePill);
    expect(setTag).toHaveBeenCalledWith(null);
  });

  it('should show "返回目录" button when tag is selected, and reset on click', () => {
    const setTag = vi.fn();
    const setQuery = vi.fn();
    render(
      <Sidebar
        {...defaultProps}
        selectedTag="技术"
        tagFilteredNotes={tagFilteredNotes}
        setSelectedTag={setTag}
        setSearchQuery={setQuery}
      />
    );
    const backBtn = screen.getByText('返回目录');
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(setTag).toHaveBeenCalledWith(null);
    expect(setQuery).toHaveBeenCalledWith('');
  });
});
