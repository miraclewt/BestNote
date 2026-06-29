/**
 * Preview.test.tsx
 * Component tests for the Preview panel.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Preview } from '../components/Preview';
import type { MockNote } from '../data/mockData';

// Mock mermaid to avoid SVG rendering in jsdom
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mermaid</svg>' }),
  },
}));

// Mock DOMPurify to pass-through in test env
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

const mockNotes: MockNote[] = [
  {
    id: '项目概述.md',
    uuid: 'uuid-1',
    title: '项目概述',
    content: '# 项目概述\n请查看 [[API设计文档]]。',
    tags: ['指南'],
    mtime: 1000,
  },
  {
    id: 'API设计文档.md',
    uuid: 'uuid-2',
    title: 'API设计文档',
    content: '# API\n参考 [[项目概述]]。',
    tags: ['技术'],
    mtime: 2000,
  },
];

describe('Preview component', () => {
  it('should show empty state when noteId is null', () => {
    render(
      <Preview noteId={null} content="" notes={mockNotes} setActiveNoteId={vi.fn()} />
    );
    expect(screen.getByText('打开笔记开始预览')).toBeInTheDocument();
  });

  it('should show preview header when a note is active', () => {
    render(
      <Preview noteId="项目概述.md" content="# 标题" notes={mockNotes} setActiveNoteId={vi.fn()} />
    );
    expect(screen.getByText('实时渲染预览')).toBeInTheDocument();
  });

  it('should render markdown headings', () => {
    render(
      <Preview noteId="项目概述.md" content="# 一级标题" notes={mockNotes} setActiveNoteId={vi.fn()} />
    );
    const h1 = document.querySelector('h1');
    expect(h1?.textContent).toContain('一级标题');
  });

  it('should show backlinks section', () => {
    render(
      <Preview noteId="项目概述.md" content="# 项目" notes={mockNotes} setActiveNoteId={vi.fn()} />
    );
    expect(screen.getByText(/反向链接/)).toBeInTheDocument();
  });

  it('should list backlinks when they exist', () => {
    // API设计文档 contains [[项目概述]], so it should be a backlink for 项目概述.md
    render(
      <Preview noteId="项目概述.md" content="# 项目" notes={mockNotes} setActiveNoteId={vi.fn()} />
    );
    expect(screen.getByText('API设计文档')).toBeInTheDocument();
  });

  it('should show "没有其他笔记引用此文档" when no backlinks', () => {
    const onlyNote: MockNote[] = [mockNotes[0]]; // only 项目概述, no one links to it
    render(
      <Preview noteId="项目概述.md" content="# 项目" notes={onlyNote} setActiveNoteId={vi.fn()} />
    );
    expect(screen.getByText('没有其他笔记引用此文档。')).toBeInTheDocument();
  });

  it('should call setActiveNoteId when backlink is clicked', () => {
    const setActive = vi.fn();
    render(
      <Preview noteId="项目概述.md" content="# 项目" notes={mockNotes} setActiveNoteId={setActive} />
    );
    const backlinkItem = screen.getByText('API设计文档').closest('.backlink-item');
    if (backlinkItem) fireEvent.click(backlinkItem);
    expect(setActive).toHaveBeenCalledWith('API设计文档.md');
  });
});
