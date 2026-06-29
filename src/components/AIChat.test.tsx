/**
 * AIChat.test.tsx
 * Component tests for the AI Chat panel.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AIChat } from '../components/AIChat';

const defaultProps = {
  messages: [
    { sender: 'ai' as const, text: '你好！我是AI助手。' },
  ],
  loading: false,
  onSendMessage: vi.fn(),
  onAbortMessage: vi.fn(),
  setActiveNoteId: vi.fn(),
};

describe('AIChat component', () => {
  it('should render existing messages', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByText('你好！我是AI助手。')).toBeInTheDocument();
  });

  it('should render the send button', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByText('发送')).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(<AIChat {...defaultProps} />);
    const sendBtn = screen.getByText('发送') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it('should enable send button when input has text', () => {
    render(<AIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/问点什么/);
    fireEvent.change(textarea, { target: { value: '测试问题' } });
    const sendBtn = screen.getByText('发送') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(false);
  });

  it('should call onSendMessage and clear input when send is clicked', () => {
    const onSend = vi.fn();
    render(<AIChat {...defaultProps} onSendMessage={onSend} />);
    const textarea = screen.getByPlaceholderText(/问点什么/);
    fireEvent.change(textarea, { target: { value: '我的问题' } });
    fireEvent.click(screen.getByText('发送'));
    expect(onSend).toHaveBeenCalledWith('我的问题');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('should call onSendMessage when Enter is pressed', () => {
    const onSend = vi.fn();
    render(<AIChat {...defaultProps} onSendMessage={onSend} />);
    const textarea = screen.getByPlaceholderText(/问点什么/);
    fireEvent.change(textarea, { target: { value: '按Enter发送' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('按Enter发送');
  });

  it('should NOT send when Shift+Enter is pressed', () => {
    const onSend = vi.fn();
    render(<AIChat {...defaultProps} onSendMessage={onSend} />);
    const textarea = screen.getByPlaceholderText(/问点什么/);
    fireEvent.change(textarea, { target: { value: '多行输入' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading is true', () => {
    render(<AIChat {...defaultProps} loading={true} />);
    expect(document.querySelector('.typing-loader')).toBeInTheDocument();
  });

  it('should show abort button when loading', () => {
    render(<AIChat {...defaultProps} loading={true} />);
    expect(screen.getByText(/停止生成/)).toBeInTheDocument();
  });

  it('should call onAbortMessage when abort button is clicked', () => {
    const onAbort = vi.fn();
    render(<AIChat {...defaultProps} loading={true} onAbortMessage={onAbort} />);
    fireEvent.click(screen.getByText(/停止生成/));
    expect(onAbort).toHaveBeenCalled();
  });

  it('should NOT show abort button when not loading', () => {
    render(<AIChat {...defaultProps} loading={false} />);
    expect(screen.queryByText(/停止生成/)).toBeNull();
  });

  it('should render wikilinks as clickable spans', () => {
    render(
      <AIChat
        {...defaultProps}
        messages={[{ sender: 'ai', text: '请参阅 [[项目概述]] 了解详情。' }]}
      />
    );
    const wikilink = document.querySelector('.ai-wikilink');
    expect(wikilink).toBeInTheDocument();
    expect(wikilink?.textContent).toBe('项目概述');
  });

  it('should call setActiveNoteId when a wikilink is clicked', () => {
    const setActive = vi.fn();
    render(
      <AIChat
        {...defaultProps}
        setActiveNoteId={setActive}
        messages={[{ sender: 'ai', text: '请参阅 [[项目概述]]。' }]}
      />
    );
    const wikilink = document.querySelector('.ai-wikilink')!;
    fireEvent.click(wikilink);
    expect(setActive).toHaveBeenCalledWith('项目概述.md');
  });

  it('should render user messages with different class', () => {
    render(
      <AIChat
        {...defaultProps}
        messages={[{ sender: 'user', text: '我问的问题' }]}
      />
    );
    const userBubble = document.querySelector('.ai-message-bubble.user');
    expect(userBubble).toBeInTheDocument();
  });

  it('should show preset question buttons', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByText(/冲突检测/)).toBeInTheDocument();
    expect(screen.getByText(/架构设计/)).toBeInTheDocument();
  });
});
