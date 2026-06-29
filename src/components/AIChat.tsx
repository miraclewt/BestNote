import React, { useState, useRef, useEffect } from 'react';
import './AIChat.css';

interface AIChatProps {
  messages: { sender: 'user' | 'ai'; text: string }[];
  loading: boolean;
  onSendMessage: (msg: string) => void;
  onAbortMessage: () => void;
  setActiveNoteId: (id: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({
  messages,
  loading,
  onSendMessage,
  onAbortMessage,
  setActiveNoteId,
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePresetClick = (q: string) => {
    if (loading) return;
    onSendMessage(q);
  };

  // Convert markdown links [[Note]] inside AI responses into clickable links
  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[\[[^\]]+\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkText = part.slice(2, -2);
        const targetNoteId = linkText.endsWith('.md') ? linkText : `${linkText}.md`;
        return (
          <span
            key={index}
            className="ai-wikilink"
            onClick={() => setActiveNoteId(targetNoteId)}
            title={`跳转到笔记: ${linkText}`}
          >
            {linkText}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <span>AI 知识问答助手 (RAG)</span>
      </div>

      {/* Messages List */}
      <div className="ai-messages-list">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message-bubble ${msg.sender}`}>
            <div className="bubble-avatar">{msg.sender === 'user' ? 'You' : 'AI'}</div>
            <div className="bubble-content">
              <p className="bubble-text">{renderMessageText(msg.text)}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message-bubble ai loading">
            <div className="bubble-avatar">AI</div>
            <div className="bubble-content">
              <div className="typing-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Abort button when streaming */}
      {loading && (
        <div className="ai-abort-row">
          <button className="abort-btn" onClick={onAbortMessage}>
            停止生成
          </button>
        </div>
      )}

      {/* Preset Questions */}
      <div className="preset-questions">
        <span className="preset-title">热门问题推荐:</span>
        <div className="preset-list">
          <button
            className="preset-item"
            disabled={loading}
            onClick={() => handlePresetClick('什么是冲突检测机制？')}
          >
            什么是冲突检测？
          </button>
          <button
            className="preset-item"
            disabled={loading}
            onClick={() => handlePresetClick('介绍一下这款笔记软件的架构')}
          >
            软件的架构设计？
          </button>
        </div>
      </div>

      {/* Input controls */}
      <div className="ai-chat-input-row">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="问点什么... (Enter 发送, Shift+Enter 换行)"
          rows={1}
          disabled={loading}
          className="ai-chat-textarea"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="ai-send-btn"
        >
          发送
        </button>
      </div>
    </div>
  );
};
export default AIChat;
