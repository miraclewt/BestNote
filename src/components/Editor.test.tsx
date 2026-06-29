/**
 * Editor.test.tsx
 * Component tests for the Editor panel.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Editor } from '../components/Editor';

describe('Editor component', () => {
  const defaultProps = {
    content: '# Hello World\nLine 2',
    onContentChange: vi.fn(),
    isDirty: false,
    openMtime: 0,
  };

  it('should render the textarea with current content', () => {
    render(<Editor {...defaultProps} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('# Hello World\nLine 2');
  });

  it('should show line numbers', () => {
    render(<Editor {...defaultProps} />);
    // 2 lines → line numbers 1 and 2
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show character count', () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByText(`共 ${defaultProps.content.length} 个字符`)).toBeInTheDocument();
  });

  it('should show line count', () => {
    render(<Editor {...defaultProps} />);
    const lines = defaultProps.content.split('\n').length;
    expect(screen.getByText(`共 ${lines} 行`)).toBeInTheDocument();
  });

  it('should show "无" as mtime when openMtime is 0', () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByText(/无/)).toBeInTheDocument();
  });

  it('should show "未保存修改" badge when isDirty', () => {
    render(<Editor {...defaultProps} isDirty={true} />);
    expect(screen.getByText('未保存修改')).toBeInTheDocument();
  });

  it('should NOT show dirty badge when isDirty is false', () => {
    render(<Editor {...defaultProps} isDirty={false} />);
    expect(screen.queryByText('未保存修改')).toBeNull();
  });

  it('should call onContentChange when user types', () => {
    const onChange = vi.fn();
    render(<Editor {...defaultProps} onContentChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new content' } });
    expect(onChange).toHaveBeenCalledWith('new content');
  });

  it('should render toolbar buttons', () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByTitle('标题')).toBeInTheDocument();
    expect(screen.getByTitle('二级标题')).toBeInTheDocument();
    expect(screen.getByTitle('加粗')).toBeInTheDocument();
    expect(screen.getByTitle('WikiLink 双向链接')).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    render(<Editor {...defaultProps} content="" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    // Should still show at least line 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
