import { useState, useEffect, useRef } from 'react';
import type { SearchResult } from '../types';
import type { MockNote } from '../data/mockData';
import { initialNotes, buildFileTree } from '../data/mockData';
import { searchNotes } from '../utils/noteUtils';

export function useAppStore() {
  const [currentVault, setCurrentVault] = useState<string | null>('C:\\Users\\Desktop\\TeamShare');
  const [notes, setNotes] = useState<MockNote[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>('项目概述.md');
  const [activeNoteContent, setActiveNoteContent] = useState<string>('');
  const [openMtime, setOpenMtime] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // AI State
  const [aiMessages, setAiMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: '你好！我是团队笔记AI助手。我可以基于当前笔记库的内容为您提供知识问答。试着问我一些问题吧！' }
  ]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const aiAbortController = useRef<AbortController | null>(null);

  // Conflict State
  const [conflict, setConflict] = useState<{
    path: string;
    localContent: string;
    diskContent: string;
    expectedMtime: number;
    actualMtime: number;
  } | null>(null);

  // Toasts
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Load active note content
  useEffect(() => {
    if (activeNoteId) {
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        setActiveNoteContent(note.content);
        setOpenMtime(note.mtime);
        setIsDirty(false);
      }
    } else {
      setActiveNoteContent('');
      setOpenMtime(0);
      setIsDirty(false);
    }
  }, [activeNoteId, notes]);

  // Handle active note content change
  const handleContentChange = (content: string) => {
    setActiveNoteContent(content);
    setIsDirty(true);
  };

  // Safe Save file with conflict check (mtime simulation)
  const saveActiveNote = (forceContent?: string) => {
    if (!activeNoteId) return;

    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex === -1) return;

    const currentNote = notes[noteIndex];
    const contentToSave = forceContent !== undefined ? forceContent : activeNoteContent;

    // Simulate concurrent modification check
    // If the file's mtime in state is different from the current note in database (simulate external write)
    if (openMtime !== currentNote.mtime) {
      setConflict({
        path: activeNoteId,
        localContent: contentToSave,
        diskContent: currentNote.content,
        expectedMtime: openMtime,
        actualMtime: currentNote.mtime
      });
      return;
    }

    // Save successfully
    const updatedNotes = [...notes];
    const newMtime = Date.now();
    updatedNotes[noteIndex] = {
      ...currentNote,
      content: contentToSave,
      mtime: newMtime
    };

    setNotes(updatedNotes);
    setOpenMtime(newMtime);
    setIsDirty(false);
    showToast('保存成功！');
  };

  // Resolve conflict
  const resolveConflict = (strategy: 'overwrite' | 'merge' | 'discard', mergedContent?: string) => {
    if (!conflict || !activeNoteId) return;

    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex === -1) return;

    if (strategy === 'overwrite') {
      // Overwrite with local content
      const updatedNotes = [...notes];
      const newMtime = Date.now();
      updatedNotes[noteIndex] = {
        ...notes[noteIndex],
        content: conflict.localContent,
        mtime: newMtime
      };
      setNotes(updatedNotes);
      setOpenMtime(newMtime);
      setIsDirty(false);
      setConflict(null);
      showToast('强制覆盖成功！');
    } else if (strategy === 'merge' && mergedContent !== undefined) {
      // Save merged content
      const updatedNotes = [...notes];
      const newMtime = Date.now();
      updatedNotes[noteIndex] = {
        ...notes[noteIndex],
        content: mergedContent,
        mtime: newMtime
      };
      setNotes(updatedNotes);
      setOpenMtime(newMtime);
      setIsDirty(false);
      setConflict(null);
      showToast('合并保存成功！');
    } else if (strategy === 'discard') {
      // Discard and load disk content
      setActiveNoteContent(conflict.diskContent);
      setOpenMtime(conflict.actualMtime);
      setIsDirty(false);
      setConflict(null);
      showToast('已载入磁盘最新版本！');
    }
  };

  // Simulate external file change (to demonstrate concurrency conflict)
  const simulateExternalChange = () => {
    if (!activeNoteId) return;
    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex === -1) return;

    const updatedNotes = [...notes];
    updatedNotes[noteIndex] = {
      ...notes[noteIndex],
      content: notes[noteIndex].content + '\n\n*(这是其他团队成员在共享网盘上修改的内容)*',
      mtime: Date.now()
    };
    setNotes(updatedNotes);
    showToast('模拟外部写入：网盘上的文件已被修改！');
  };

  // Search logic — delegates to pure utility function
  const searchResults: SearchResult[] = searchNotes(notes, searchQuery);

  // RAG AI Query simulation
  const askAI = async (question: string) => {
    if (!question.trim()) return;

    // Add user message
    setAiMessages(prev => [...prev, { sender: 'user', text: question }]);
    setAiLoading(true);

    // Setup abort controller
    const controller = new AbortController();
    aiAbortController.current = controller;

    try {
      // RAG context retrieval simulation
      const matchedNotes = notes
        .map(note => {
          let score = 0;
          const words = question.split(/[\s，。？、]/);
          words.forEach(word => {
            if (word && note.content.toLowerCase().includes(word.toLowerCase())) score++;
            if (word && note.title.toLowerCase().includes(word.toLowerCase())) score += 3;
          });
          return { note, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.note);

      // Assemble prompt with context
      const contextText = matchedNotes.length > 0
        ? matchedNotes.map(n => `【相关文档：${n.title}】\n${n.content.slice(0, 150)}...`).join('\n\n')
        : '没有检索到直接相关的本地笔记。';
      console.log('RAG Context:', contextText);
      // Answer generation template based on questions
      let answerTemplate = '基于您的笔记库：\n\n';
      const questionLower = question.toLowerCase();

      if (questionLower.includes('冲突') || questionLower.includes('保存')) {
        answerTemplate += `关于保存与冲突处理逻辑，根据您的 [[API设计文档]]，系统采用了 **mtime 乐观锁** 机制：
1. 当您打开笔记时，系统记录其修改时间戳 \`mtime\`；
2. 当您进行保存时，后台的 \`write_file_safe\` 会核对您持有的 \`mtime\` 是否与网盘文件一致；
3. 如果有人在您之后写入，则系统会提示冲突并调出 Diff 对比，供您选择覆盖、合并或放弃。

在您当前打开的文件上，您可以点击编辑器底部的 **"模拟外部修改"**，然后尝试保存（Ctrl+S），即可亲身体验该冲突控制。`;
      } else if (questionLower.includes('架构') || questionLower.includes('介绍') || questionLower.includes('笔记软件')) {
        answerTemplate += `团队分享笔记软件的整体架构设计如下：
- **无服务器客户端**：基于 Tauri 2.0，前端 React + TS，后端 Rust，通过共享网盘协同；
- **文本渲染**：前台使用 Markdown 解析（Milkdown 统一引擎），并支持 Mermaid 图表；
- **安全过滤**：配置了严格的 CSP 策略，并通过 DOMPurify 净化防止 XSS；
- **文件检索**：使用 MiniSearch 进行后台检索（配合 Web Worker）。

详情可以查阅您的 [[项目概述]]。`;
      } else if (matchedNotes.length > 0) {
        answerTemplate += `我为您找到以下相关信息：\n\n` + 
          matchedNotes.map(n => `在**《${n.title}》**中提到：\n${n.content.slice(0, 200)}...`).join('\n\n') +
          `\n\n如需更多细节，建议直接阅读 [[${matchedNotes[0].title}]]。`;
      } else {
        answerTemplate += `抱歉，没有在当前笔记库中检索到有关 "${question}" 的直接信息。

不过系统已经根据您的需求，在底层设计了标准 RAG 上下文组装。您可以参考 [[项目概述]] 了解 AIAdapter 的详细设计架构。`;
      }

      // Simulate stream generator
      setAiMessages(prev => [...prev, { sender: 'ai', text: '' }]);
      
      const charArray = answerTemplate.split('');
      let currentText = '';
      
      for (let i = 0; i < charArray.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('AbortError');
        }
        currentText += charArray[i];
        
        // Update last message
        setAiMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { sender: 'ai', text: currentText };
          return next;
        });
        
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    } catch (err: any) {
      if (err.message === 'AbortError') {
        setAiMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { 
            sender: 'ai', 
            text: next[next.length - 1].text + '\n\n*[生成已由用户中断]*' 
          };
          return next;
        });
      } else {
        setAiMessages(prev => [...prev, { sender: 'ai', text: '请求发生错误，请检查您的配置或网络环境。' }]);
      }
    } finally {
      setAiLoading(false);
      aiAbortController.current = null;
    }
  };

  const abortAI = () => {
    if (aiAbortController.current) {
      aiAbortController.current.abort();
    }
  };

  const fileTree = buildFileTree(notes);

  return {
    currentVault,
    notes,
    activeNoteId,
    activeNoteContent,
    openMtime,
    isDirty,
    searchQuery,
    theme,
    toast,
    conflict,
    aiMessages,
    aiLoading,
    searchResults,
    fileTree,
    setSearchQuery,
    setActiveNoteId,
    handleContentChange,
    saveActiveNote,
    simulateExternalChange,
    resolveConflict,
    askAI,
    abortAI,
    setTheme,
    setCurrentVault,
    setConflict
  };
}
