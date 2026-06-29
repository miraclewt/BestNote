# 需求文档

## 简介

团队内部笔记分享平台，面向企业内网环境设计。该系统以桌面应用形式运行，笔记以 Markdown 文件存储在企业网盘（UNC 路径或映射盘符）中，支持多人通过访问同一网盘路径共享笔记。系统具备所见即所得编辑体验、知识链接、全文搜索、AI 问答接入和 Mermaid 图表渲染等功能，所有技术栈须为开源项目。

## 词汇表

- **笔记库（Vault）**：以文件夹为根目录，包含所有 Markdown 笔记文件及资源的目录结构
- **笔记（Note）**：单个 Markdown（.md）文件
- **编辑器（Editor）**：提供 Markdown 文本编辑功能的 UI 组件
- **渲染器（Renderer）**：将 Markdown 内容转换为 HTML 进行展示的组件
- **文件系统（FileSystem）**：操作系统提供的本地/网盘文件读写接口
- **索引器（Indexer）**：扫描笔记库、建立全文搜索索引的后台组件
- **搜索引擎（SearchEngine）**：基于索引提供全文检索功能的组件
- **标签（Tag）**：笔记 Front Matter 或正文中以 `#tag` 形式标记的分类关键词
- **双向链接（WikiLink）**：以 `[[笔记名]]` 语法在笔记之间创建的内部超链接
- **AI 适配器（AIAdapter）**：与本地或云端 LLM 通信的接口层
- **UNC 路径**：通用命名约定路径，格式为 `\\服务器名\共享名\路径`
- **Front Matter**：笔记文件顶部 `---` 包裹的 YAML 元数据块

---

## 需求

### 需求 1：笔记库管理

**用户故事：** 作为团队成员，我希望能够打开企业网盘上的文件夹作为笔记库，以便在不依赖服务器的情况下访问和管理团队笔记。

#### 验收标准

1. WHEN 用户选择一个本地或 UNC 网络路径的文件夹，THE 应用程序（App）SHALL 将其作为笔记库根目录加载，并在侧边栏展示完整的文件夹树结构
2. WHEN 笔记库根目录下存在子文件夹，THE App SHALL 递归展示所有层级的文件夹和 .md 文件
3. WHEN 用户点击侧边栏中的笔记文件，THE App SHALL 在编辑区打开对应的 Markdown 文件
4. IF 指定路径不存在或无读取权限，THEN THE App SHALL 显示包含具体错误描述的提示信息，并保持当前笔记库状态不变
5. THE App SHALL 持久化用户最近打开的笔记库路径列表，以便下次启动时快速访问
6. WHEN 用户切换笔记库，THE App SHALL 保存当前已打开笔记的编辑状态后再切换
7. WHEN 用户保存文件时文件已被其他用户修改（mtime 不一致），THE App SHALL 显示冲突对话框，展示本地版本与磁盘版本的 diff 对比，支持用户选择覆盖、合并或放弃修改，不得静默覆盖

---

### 需求 2：Markdown 编辑与实时预览

**用户故事：** 作为内容创作者，我希望拥有所见即所得或分栏预览的 Markdown 编辑体验，以便专注于内容本身而无需担心排版。

#### 验收标准

1. THE Editor SHALL 支持以下 Markdown 语法：标题（H1-H6）、粗体、斜体、有序列表、无序列表、代码块、行内代码、引用块、分隔线、表格、链接
2. WHEN 用户在编辑器中输入或修改内容，THE Renderer SHALL 在 500ms 内更新预览区域，无需手动刷新
3. WHERE 用户选择所见即所得模式，THE Editor SHALL 在同一视图中直接呈现格式化效果（如粗体文字直接显示为粗体）
4. WHERE 用户选择分栏预览模式，THE Editor SHALL 在左侧显示原始 Markdown 文本，在右侧同步显示渲染后的 HTML 预览
5. WHEN 用户保存文件（Ctrl+S），THE FileSystem SHALL 将当前编辑内容写入对应 .md 文件，并在 1 秒内完成
6. THE Editor SHALL 提供自动格式化功能，WHEN 用户触发格式化命令，THE Editor SHALL 对当前文档进行标准化缩进和换行处理
7. WHEN 用户修改内容后尚未保存，THE App SHALL 在标题栏或标签页显示未保存标记（如 * 号）

---

### 需求 3：图片支持

**用户故事：** 作为内容创作者，我希望能够方便地在笔记中插入图片，以便丰富文档内容表达。

#### 验收标准

1. WHEN 用户从操作系统文件管理器拖拽图片文件到编辑区，THE Editor SHALL 将该图片复制到笔记库的指定图片目录，并自动在光标位置插入对应的 Markdown 图片语法
2. WHEN 用户在编辑区执行粘贴操作（Ctrl+V）且剪贴板含有图片数据，THE Editor SHALL 将图片以 PNG 格式保存到笔记库的指定图片目录，并自动插入 Markdown 图片语法
3. THE Renderer SHALL 正确渲染 Markdown 中引用的本地图片路径（相对路径和绝对路径）
4. WHEN 图片保存时，THE FileSystem SHALL 使用基于时间戳的唯一文件名，以避免文件名冲突
5. IF 图片文件不存在或路径无效，THEN THE Renderer SHALL 显示包含原始路径信息的占位符图标，而不是空白区域
6. THE App SHALL 支持常见图片格式：PNG、JPG/JPEG、GIF、WebP、SVG

---

### 需求 4：知识链接与标签组织

**用户故事：** 作为知识管理者，我希望通过双向链接和标签来组织笔记之间的关系，以便构建结构化的知识体系。

#### 验收标准

1. WHEN 用户在笔记中输入 `[[笔记名]]` 语法，THE Editor SHALL 显示自动补全候选列表，列出笔记库中文件名匹配的笔记
2. WHEN 用户点击渲染后的 WikiLink，THE App SHALL 导航到对应的目标笔记；IF 目标笔记不存在，THEN THE App SHALL 提示用户创建该笔记
3. THE App SHALL 在笔记详情面板中展示当前笔记被其他笔记引用的反向链接（Backlinks）列表
4. WHEN 用户在笔记 Front Matter 或正文中定义标签（`tags: [tag1, tag2]` 或 `#tag`），THE Indexer SHALL 在下次索引更新时将其记录到标签索引中
5. THE App SHALL 提供标签面板，展示笔记库中所有标签及其关联笔记数量
6. WHEN 用户点击标签，THE App SHALL 展示所有包含该标签的笔记列表
7. THE App SHALL 提供知识图谱视图，以节点和连线可视化展示笔记之间的链接关系

---

### 需求 5：全文搜索

**用户故事：** 作为团队成员，我希望能够快速搜索到笔记库中的相关内容，以便高效地查找和利用团队知识。

#### 验收标准

1. THE SearchEngine SHALL 支持对笔记库中所有 .md 文件的标题、正文、标签进行全文索引
2. WHEN 用户在搜索框输入关键词并提交，THE SearchEngine SHALL 在 2 秒内返回匹配结果列表，每条结果包含文件名、匹配摘要（含关键词高亮）
3. WHEN 笔记库中的笔记被新增、修改或删除，THE Indexer SHALL 在 30 秒内完成对应索引的增量更新
4. THE SearchEngine SHALL 支持以下搜索语法：精确短语搜索（引号包裹）、标签过滤（`tag:标签名`）、文件路径过滤（`path:路径`）
5. WHEN 搜索结果为空，THE App SHALL 显示明确的无结果提示，并建议用户调整搜索关键词
6. THE Indexer SHALL 在笔记库首次打开时完成全量索引构建，并在构建过程中显示进度提示

---

### 需求 6：AI 问答接入

**用户故事：** 作为知识工作者，我希望能够通过 AI 对笔记库内容进行问答，以便快速获得基于团队知识的智能回答。

#### 验收标准

1. THE App SHALL 提供 AI 配置面板，支持用户配置 LLM 接入参数：API 端点 URL、API 密钥、模型名称
2. WHERE 用户配置了 AI 接入，THE App SHALL 提供 AI 问答界面，用户可输入自然语言问题
3. WHEN 用户提交问题，THE AIAdapter SHALL 将问题与相关笔记内容（通过搜索检索）组装为上下文，发送至配置的 LLM 端点
4. WHEN AIAdapter 收到 LLM 的响应，THE App SHALL 在问答界面流式展示回答内容
5. IF LLM 端点不可达或返回错误，THEN THE AIAdapter SHALL 向用户显示包含 HTTP 状态码的错误提示，并保留用户的原始问题
6. THE App SHALL 支持本地部署的 OpenAI 兼容 API（如 Ollama）和标准 OpenAI API 格式

---

### 需求 7：Mermaid 图表渲染

**用户故事：** 作为技术文档编写者，我希望在笔记中使用 Mermaid 语法创建流程图和时序图，以便在文档中直观表达复杂流程。

#### 验收标准

1. WHEN Renderer 处理含有 ` ```mermaid ` 代码块的笔记，THE Renderer SHALL 将其渲染为对应的矢量图形，支持：流程图（flowchart）、时序图（sequenceDiagram）、甘特图（gantt）、类图（classDiagram）、状态图（stateDiagram）
2. IF Mermaid 语法存在错误，THEN THE Renderer SHALL 显示包含错误位置的描述性错误信息，而不是空白区域
3. THE Renderer SHALL 在分栏预览模式和所见即所得模式下均正确渲染 Mermaid 图表
4. WHEN 用户修改 Mermaid 代码块内容，THE Renderer SHALL 在 500ms 内更新对应图表的渲染结果

---

### 需求 8：安全性

**用户故事：** 作为企业 IT 管理员，我希望团队笔记平台具备基本的安全防护，以便保护企业内部知识不被意外泄露或破坏。

#### 验收标准

1. THE App SHALL 对所有用户输入的内容（包括笔记 Markdown 原文）在渲染前进行 HTML 净化（Sanitize），以防止 XSS 攻击
2. THE App SHALL 仅允许 AI 配置中填写的 API 密钥在本地配置文件中加密存储，不得在日志或界面上明文显示
3. IF 笔记内容中包含 `<script>` 等可执行脚本标签，THEN THE Renderer SHALL 将其移除后再渲染，并在控制台记录告警日志
4. THE App SHALL 限制 Markdown 图片和链接仅解析相对路径或本地文件协议（`file://`），拒绝渲染指向外部网络的内嵌资源
5. WHERE 用户配置了 AI API 密钥，THE App SHALL 在内存中持有密钥的时间不超过单次请求周期，请求完成后立即清除引用
6. THE App SHALL 在 WebView 中配置严格的内容安全策略（CSP），禁止 eval()、内联脚本和未授权的外部资源加载
7. THE App SHALL 对所有文件操作命令的路径参数进行安全校验，拒绝 canonicalize 后超出笔记库根目录范围的路径，防止路径穿越攻击
