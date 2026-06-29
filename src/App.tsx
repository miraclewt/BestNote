import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AIChat } from './components/AIChat';
import { aggregateTags, filterNotesByTag, mergeConflict } from './utils/noteUtils';
import './App.css';

export const App: React.FC = () => {
  const store = useAppStore();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAI, setShowAI] = useState<boolean>(false);

  // Sync state theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme);
  }, [store.theme]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        store.saveActiveNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.saveActiveNote]);

  // Compute all tags dynamically
  const allTags = useMemo(() => aggregateTags(store.notes), [store.notes]);

  // Notes filtered by the active tag (passed to Sidebar for rendering)
  const tagFilteredNotes = useMemo(
    () => (selectedTag ? filterNotesByTag(store.notes, selectedTag) : []),
    [store.notes, selectedTag]
  );

  // Handle 三路自动合并 simulation
  const handleAutoMerge = () => {
    if (!store.conflict) return;
    const merged = mergeConflict(store.conflict.localContent, store.conflict.diskContent);
    store.resolveConflict('merge', merged);
  };

  return (
    <div className="app-frame">
      {/* Title bar */}
      <Titlebar
        currentVault={store.currentVault}
        activeNoteId={store.activeNoteId}
        isDirty={store.isDirty}
        theme={store.theme}
        setTheme={store.setTheme}
        saveActiveNote={store.saveActiveNote}
        simulateExternalChange={store.simulateExternalChange}
        showAI={showAI}
        setShowAI={setShowAI}
      />

      {/* Main Workspace layout */}
      <div className="workspace-layout">
        {/* Sidebar */}
        <Sidebar
          fileTree={store.fileTree}
          activeNoteId={store.activeNoteId}
          setActiveNoteId={store.setActiveNoteId}
          searchQuery={store.searchQuery}
          setSearchQuery={store.setSearchQuery}
          searchResults={store.searchResults}
          allTags={allTags}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          tagFilteredNotes={tagFilteredNotes}
        />

        {/* Editor — Typora WYSIWYG mode */}
        <main className="workspace-main">
          {store.activeNoteId ? (
            <Editor
              content={store.activeNoteContent}
              onContentChange={store.handleContentChange}
              isDirty={store.isDirty}
              openMtime={store.openMtime}
              onSave={store.saveActiveNote}
              setActiveNoteId={store.setActiveNoteId}
            />
          ) : (
            <div className="workspace-welcome">
              <div className="welcome-box">
                <span className="welcome-logo">🌌</span>
                <h2>欢迎使用团队内部笔记平台</h2>
                <p>无服务器架构设计，所有笔记均以 Markdown 文档存放于共享盘。</p>
                <p className="welcome-tip">请从左侧栏选择或点击任意文档开始编辑，支持 [[WikiLink]] 双向链接联想补全与跳转。</p>
              </div>
            </div>
          )}
        </main>

        {/* AI Panel */}
        {showAI && (
          <AIChat
            messages={store.aiMessages}
            loading={store.aiLoading}
            onSendMessage={store.askAI}
            onAbortMessage={store.abortAI}
            setActiveNoteId={store.setActiveNoteId}
          />
        )}
      </div>

      {/* Floating Save Toast Notification */}
      {store.toast && (
        <div className="save-toast-container">
          <div className="save-toast">
            <span className="toast-icon">✓</span>
            <span className="toast-text">{store.toast}</span>
          </div>
        </div>
      )}

      {/* Save Conflict Modal Dialog (Optimistic Locking) */}
      {store.conflict && (
        <div className="modal-backdrop">
          <div className="conflict-modal">
            <div className="modal-header">
              <span className="modal-header-icon">!</span>
              <h3>检测到网盘保存冲突</h3>
            </div>

            <div className="modal-body">
              <p className="conflict-desc">
                当您在编辑此笔记 <code>{store.conflict.path}</code> 的期间，其他团队成员已经向共享盘写入了最新修改。
                直接保存将会覆盖他的工作成果！
              </p>

              <div className="conflict-meta-comparison">
                <div>打开时文件时间戳：<code>{new Date(store.conflict.expectedMtime).toLocaleTimeString()}</code></div>
                <div>网盘上最新时间戳：<code className="newer-ts">{new Date(store.conflict.actualMtime).toLocaleTimeString()} (较新)</code></div>
              </div>

              {/* Side by side diff preview simulation */}
              <div className="diff-simulation-box">
                <div className="diff-panel local">
                  <div className="diff-panel-title">您的本地修改版本 (未保存)</div>
                  <pre className="diff-pre">{store.conflict.localContent}</pre>
                </div>
                <div className="diff-panel disk">
                  <div className="diff-panel-title">共享网盘最新版本 (只读)</div>
                  <pre className="diff-pre">{store.conflict.diskContent}</pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn merge-btn"
                onClick={handleAutoMerge}
                title="模拟自动三路合并"
              >
                合并并编辑
              </button>
              <button
                className="modal-btn overwrite-btn"
                onClick={() => store.resolveConflict('overwrite')}
                title="强制使用您的本地修改覆盖网盘文件"
              >
                覆盖网盘
              </button>
              <button
                className="modal-btn discard-btn"
                onClick={() => store.resolveConflict('discard')}
                title="丢弃您的修改并重新加载网盘最新版"
              >
                放弃并载入最新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
