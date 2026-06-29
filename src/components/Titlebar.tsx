import React from 'react';
import './Titlebar.css';

interface TitlebarProps {
  currentVault: string | null;
  activeNoteId: string | null;
  isDirty: boolean;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  saveActiveNote: () => void;
  simulateExternalChange: () => void;
  showAI: boolean;
  setShowAI: (v: boolean) => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  currentVault,
  activeNoteId,
  isDirty,
  theme,
  setTheme,
  saveActiveNote,
  simulateExternalChange,
  showAI,
  setShowAI,
}) => {
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <span className="app-logo"></span>
        <span className="app-title">团队共享笔记</span>
        <span className="vault-badge">
          {currentVault ? currentVault.split('\\').pop() : '未打开笔记库'}
        </span>
      </div>

      <div className="titlebar-center">
        {activeNoteId ? (
          <span className="active-file-name">
            {activeNoteId}
            {isDirty && <span className="unsaved-dot">●</span>}
          </span>
        ) : (
          <span className="no-file-active">未选择文件</span>
        )}
      </div>

      <div className="titlebar-right">
        {activeNoteId && (
          <>
            <button
              className="action-btn sim-btn"
              onClick={simulateExternalChange}
              title="模拟网盘上的该文件被其他协作者修改并保存"
            >
              模拟冲突
            </button>
            <button
              className="action-btn save-btn"
              onClick={saveActiveNote}
              title="保存当前笔记 (Ctrl+S)"
            >
              保存
            </button>
          </>
        )}
        <button
          className="action-btn ai-toggle-titlebar"
          onClick={() => setShowAI(!showAI)}
          title="切换 AI 助手面板"
        >
          AI{showAI ? ' ON' : ' OFF'}
        </button>
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="切换主题"
        >
          {theme === 'dark' ? '亮' : '暗'}
        </button>
        <div className="win-controls">
          <span className="win-min">—</span>
          <span className="win-max">□</span>
          <span className="win-close">×</span>
        </div>
      </div>
    </div>
  );
};
export default Titlebar;
