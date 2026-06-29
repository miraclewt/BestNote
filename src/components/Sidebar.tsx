import React, { useState } from 'react';
import type { FileTreeNode, SearchResult } from '../types';
import type { NoteItem } from '../utils/noteUtils';
import './Sidebar.css';

interface SidebarProps {
  fileTree: FileTreeNode[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResult[];
  allTags: { tag: string; count: number }[];
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  /** Notes pre-filtered by the selected tag (computed in App) */
  tagFilteredNotes: NoteItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  fileTree,
  activeNoteId,
  setActiveNoteId,
  searchQuery,
  setSearchQuery,
  searchResults,
  allTags,
  selectedTag,
  setSelectedTag,
  tagFilteredNotes,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setCollapsedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Recursive renderer for the file tree
  const renderTreeNodes = (nodes: FileTreeNode[]) => {
    return nodes.map(node => {
      const isFolder = node.type === 'folder';
      const isCollapsed = collapsedFolders[node.path];
      const isActive = activeNoteId === node.path || activeNoteId === node.path + '.md';

      if (isFolder) {
        return (
          <div key={node.path} className="tree-folder-group">
            <div
              className="tree-item folder-item"
              onClick={() => toggleFolder(node.path)}
            >
              <span className={`folder-arrow ${isCollapsed ? '' : 'expanded'}`}>▶</span>
              <span className="item-icon">/</span>
              <span className="item-name">{node.name}</span>
            </div>
            {!isCollapsed && node.children && (
              <div className="tree-folder-children">
                {renderTreeNodes(node.children)}
              </div>
            )}
          </div>
        );
      } else {
        const noteId = node.path.endsWith('.md') ? node.path : `${node.path}.md`;
        return (
          <div
            key={node.path}
            className={`tree-item file-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveNoteId(noteId)}
          >
            <span className="item-icon">*</span>
            <span className="item-name">{node.name}</span>
          </div>
        );
      }
    });
  };

  return (
    <aside className="sidebar">
      {/* Search Section */}
      <div className="search-container">
        <input
          type="text"
          placeholder="全文检索 (支持 #标签 或文件名)..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (selectedTag) setSelectedTag(null);
          }}
          className="search-input"
        />
        {searchQuery && (
          <button className="clear-btn" onClick={() => setSearchQuery('')}>
            ×
          </button>
        )}
      </div>

      {/* Main List Area */}
      <div className="sidebar-content">
        {searchQuery.trim() ? (
          // Search Results View
          <div className="search-results">
            <div className="section-title">搜索结果 ({searchResults.length})</div>
            {searchResults.length > 0 ? (
              searchResults.map(result => (
                <div
                  key={result.id}
                  className={`search-result-item ${activeNoteId === result.id ? 'active' : ''}`}
                  onClick={() => setActiveNoteId(result.id)}
                >
                  <div className="result-title">{result.title}</div>
                  <div className="result-snippet">{result.snippet}</div>
                  <div className="result-tags">
                    {result.tags.map(t => (
                      <span key={t} className="tag-pill">#{t}</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">无匹配笔记</div>
            )}
          </div>
        ) : selectedTag ? (
          // Tag-filtered view — now actually shows the matching notes
          <div className="search-results">
            <div className="section-title-with-back">
              <span>标签: #{selectedTag}</span>
              <button
                className="back-btn"
                onClick={() => {
                  setSelectedTag(null);
                  setSearchQuery('');
                }}
              >
                返回目录
              </button>
            </div>
            {tagFilteredNotes.length > 0 ? (
              tagFilteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`search-result-item ${activeNoteId === note.id ? 'active' : ''}`}
                  onClick={() => setActiveNoteId(note.id)}
                >
                  <div className="result-title">{note.title}</div>
                  <div className="result-snippet">
                    {note.content.slice(0, 60).replace(/\n/g, ' ')}...
                  </div>
                  <div className="result-tags">
                    {note.tags.map(t => (
                      <span key={t} className="tag-pill">#{t}</span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">该标签下没有笔记</div>
            )}
          </div>
        ) : (
          // Standard File Tree View
          <div className="file-tree">
            <div className="section-title">工作目录</div>
            {renderTreeNodes(fileTree)}
          </div>
        )}
      </div>

      {/* Tags Panel */}
      <div className="tags-panel">
        <div className="section-title">标签分类</div>
        <div className="tags-cloud">
          {allTags.map(({ tag, count }) => (
            <span
              key={tag}
              className={`tag-cloud-item ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => {
                if (selectedTag === tag) {
                  setSelectedTag(null);
                  setSearchQuery('');
                } else {
                  setSelectedTag(tag);
                  setSearchQuery(''); // clear text query when switching to tag filter
                }
              }}
            >
              #{tag} <span className="tag-count">({count})</span>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
