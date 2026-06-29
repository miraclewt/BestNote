# 团队笔记平台 — 架构优化实施计划

基于架构审查结果，对 `.kiro/specs/team-notes-platform/design.md` 和 `.kiro/specs/team-notes-platform/requirements.md` 进行架构优化。

---

## 优化要点与设计决策

### 1. 并发写入冲突控制（🔴 高优先级）
- **设计决策**：采用 **mtime 乐观锁 + 可视化 diff 合并** 方案。
- **改动**：在保存时检查文件最后修改时间戳（`mtime`）是否发生变化。如发生改变，通过 Tauri IPC 返回冲突并携带最新磁盘内容。前端弹出冲突对比对话框（本地版 vs 磁盘版），由用户选择覆盖、手动合并或丢弃修改。
- **影响文件**：`design.md`, `requirements.md`

### 2. Rust IPC 路径安全验证（🔴 高优先级）
- **设计决策**：增加 Rust 端文件操作的路径合法性校验。
- **改动**：引入 `validate_path` 内部方法。在处理任何 `read` / `write` 指令前，首先对输入路径进行 `canonicalize`，并验证其是否在当前的 `vault_root`（笔记库根目录）之下，阻止路径穿越越权。
- **影响文件**：`design.md`

### 3. 文件监听 Fallback 策略（🔴 高优先级）
- **设计决策**：主事件驱动 + 轮询 fallback 监听。
- **改动**：在 UNC 网络共享盘等文件系统事件（如 `notify`）不可信的环境下，自动开启 30 秒轮询（Polling）检测机制。通过写入临时文件检测系统文件事件是否能够送达，超时未送达时降级为 Polling。
- **影响文件**：`design.md`

### 4. 编辑器统一为单引擎（🟡 中优先级）
- **设计决策**：将原本双引擎（CodeMirror 6 源码 + ProseMirror 所见即所得）合并为单个 **Milkdown** 引擎。
- **改动**：由于双引擎在切换时容易造成 Markdown 格式缩进或表格等细节格式损坏，使用基于 ProseMirror 的 Milkdown，在同一个引擎下支持 WYSIWYG 与分栏预览。
- **影响文件**：`design.md`

### 5. 搜索接口异步化与中文分词优化（🟡 中优先级）
- **设计决策**：使用 Web Worker 加 `jieba-wasm` 进行中文分词。
- **改动**：由于原本的逐字分词对于中文检索极不精准，且大容量笔记的索引构建在主线程易造成 UI 卡顿，搜索接口改为异步，在 Worker 内利用 WebAssembly 版结巴分词进行高效分词检索。
- **影响文件**：`design.md`

### 6. AI 问答中断与并发控制（🟡 中优先级）
- **设计决策**：支持 `AbortSignal` 中断请求。
- **改动**：在 `chat` 接口传入可选的 `AbortSignal`。用户取消问答或关闭侧边栏时中断底层的 HTTP/HTTPS 流式网络连接，节省流量与并发额度。
- **影响文件**：`design.md`

---

## 实施步骤 Plan

### 阶段一：更新规范与设计文档（已完成）
- [x] 更新 `requirements.md` 以补充冲突处理及路径安全的验收标准。
- [x] 更新 `design.md` 以重新定义 `EditorModule`, `SearchEngine`, `AIAdapter` 接口，并引入 Rust 路径校验与监听策略。
- [x] 产出完整的 [UML 架构设计文档](file:///C:/Users/18304/.gemini/antigravity/brain/6781ed78-1595-4d77-bbaf-4b8826366821/uml_architecture.md)。

### 阶段二：搭建可交互 Demo (进行中)
- [ ] 初始化 Vite + React + TS 模版项目。
- [ ] 编写核心 UI 界面（侧边栏、文件树、编辑器、预览、AI 聊天面板）。
- [ ] 实现前端 Mock 冲突处理与 RAG AI 问答的模拟逻辑，供用户直观体验。

### 阶段三：Rust 后端与 Tauri 集成（后续步骤）
- [ ] 编写 Rust 路径防御性校验模块 `validate_path`。
- [ ] 基于 `notify` 的 `PollWatcher` 与 `RecommendedWatcher` 封装双模式监听器。
- [ ] 接入 `aes-gcm` 并在 Rust 端提取主板与磁盘序列号组合通过 `Argon2id` 派生密钥。

### 阶段四：前端核心开发与性能优化（后续步骤）
- [ ] 集成 Milkdown 编辑器，编写自定义 WikiLink 与 Mermaid 插件。
- [ ] 将 MiniSearch 分离到 Worker 线程，实现 WASM 分词加载。
- [ ] 实现可视化三路 Diff 合并冲突页面。

### 阶段五：测试与验证（后续步骤）
- [ ] 使用 `fast-check` 和 `proptest` 覆盖全部 14 个正确性属性的属性测试。
- [ ] 开展 10000 篇大规模笔记检索耗时基线验证。
