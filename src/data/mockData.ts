import type { FileTreeNode } from '../types';
import { buildFileTree as buildFileTreeUtil } from '../utils/noteUtils';

export interface MockNote {
  id: string;
  uuid: string;
  title: string;
  content: string;
  tags: string[];
  mtime: number;
}

export const initialNotes: MockNote[] = [
  {
    id: '项目概述.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0001',
    title: '项目概述',
    content: `# 团队协作笔记分享平台

欢迎来到团队笔记分享平台！这是一个面向企业内网环境、不依赖中心化服务器的本地网盘共享型知识管理软件。

## 🌟 核心特性
- **无服务器设计**：通过直接共享企业网盘路径，多名团队成员即可进行协同。
- **实时预览**：支持 WYSIWYG（所见即所得）模式与分栏预览模式。
- **知识网路**：通过 [[API设计文档]] 和 [[技术方案/数据库设计]] 这样的双向链接（WikiLink）构建网状的知识图谱。
- **安全沙箱**：内置 DOMPurify，防御各类恶意脚本的 XSS 注入。

> [!NOTE]
> 这是一个基于前端的初级 Demo 演示，模拟了文件树结构、Markdown 渲染、AI 问答及编辑冲突控制机制。

## 📂 快速导航
- 接口文档请查看：[[API设计文档]]
- 数据库结构请查看：[[技术方案/数据库设计]]
- 最新技术进展：[[学习笔记/Rust入门]]`,
    tags: ['指南', '概述'],
    mtime: 1719662000000,
  },
  {
    id: 'API设计文档.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0002',
    title: 'API设计文档',
    content: `# API 设计文档

本文档定义了团队笔记软件前端与 Rust 后端之间的 Tauri IPC 接口。

## 接口定义

| 接口名称 | 参数 | 返回值 | 描述 |
| :--- | :--- | :--- | :--- |
| \`read_file_with_meta\` | \`path: string\` | \`FileWithMeta\` | 读取文件内容及 \`mtime\` 时间戳 |
| \`write_file_safe\` | \`path, content, expected_mtime\` | \`WriteResult\` | 安全写入文件，如 mtime 不符则报 Conflict |
| \`open_vault\` | \`path: string\` | \`FileTreeNode[]\` | 扫描并加载指定的笔记库 |

## 代码结构示例

\`\`\`typescript
interface FileWithMeta {
  content: string;
  mtime: number; // 毫秒时间戳
  size: number;
}
\`\`\`

## 相关说明
- 请参考 [[项目概述]] 了解架构原则。
- 数据库部分请查阅 [[技术方案/数据库设计]]。`,
    tags: ['技术', 'API', '开发'],
    mtime: 1719662100000,
  },
  {
    id: '会议纪要/2026-06-25.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0003',
    title: '2026-06-25',
    content: `# 2026-06-25 架构设计对齐会议

- **时间**：2026-06-25 15:00
- **主持人**：架构师李
- **参会人员**：研发团队全员

## 会议议程

### 1. 冲突控制方案对齐
- 决定采用 **mtime 乐观锁** 机制。
- 拒绝采用复杂的 OT 算法，以降低无服务器架构的复杂度。
- 研发人员需要完成对 [[API设计文档]] 中 \`write_file_safe\` 的实现。

## 待办任务清单
- [x] 完成架构图与 UML 设计文档
- [/] 开发前端交互 Demo 演示
- [ ] 编写 Rust 端加密存储逻辑
- [ ] 配置 tauri.conf.json 的 CSP 属性`,
    tags: ['会议', '纪要'],
    mtime: 1719662200000,
  },
  {
    id: '技术方案/微服务架构.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0004',
    title: '微服务架构',
    content: `# 微服务架构演进方案

本方案讨论如何将企业内网的笔记同步接口与云服务进行松耦合对接。

## 架构拓扑
以下是服务的调用拓扑关系（Mermaid 图表形式表现）：

\`\`\`mermaid
graph LR
  A[团队客户端] -->|IPC| B(Tauri Rust 后端)
  B -->|SMB/NFS| C[本地共享网盘]
  B -->|API| D[云同步模块]
\`\`\`

## 设计要点
1. **服务降级**：在断网时，云同步自动挂起，只保留本地局域网盘读写。
2. **安全隔离**：密钥在本地使用 AES-256-GCM 加密，具体说明见 [[项目概述]]。`,
    tags: ['架构', '方案'],
    mtime: 1719662300000,
  },
  {
    id: '技术方案/数据库设计.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0005',
    title: '数据库设计',
    content: `# 数据库设计文档 (v1.0)

本项目由于采用无服务器架构，本地数据库主要指存储于客户端本地的配置以及索引元数据。

## 配置表 (Config Schema)

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| \`theme\` | \`string\` | 页面主题 (light/dark/system) |
| \`currentVault\` | \`string\` | 当前打开的笔记库绝对路径 |
| \`encryptedApiKey\`| \`string\` | 加密后的 OpenAI API Key |

## 关系映射
- 从 [[API设计文档]] 获取接口数据结构。
- 配合本地缓存快照 \`IndexSnapshot\` 加载。`,
    tags: ['技术', '数据库', '开发'],
    mtime: 1719662400000,
  },
  {
    id: '学习笔记/Rust入门.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0006',
    title: 'Rust入门',
    content: `# Rust 开发入门笔记

Rust 是一门系统级编程语言，本笔记记录其核心概念。

## 1. 所有权 (Ownership)
所有权是 Rust 最独特的功能，它让 Rust 无需垃圾回收器即可保证内存安全。

\`\`\`rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 所有权转移了 (Move)
    // println!("{}", s1); // 编译报错！
    println!("{}", s2);
}
\`\`\`

## 2. 生命期 (Lifetimes)
生命期确保所有的借用都是合法的，防止出现悬垂指针。

## 3. 并发编程
- 线程安全标记：\`Send\` 与 \`Sync\`。
- 在我们的笔记项目里，我们主要使用多线程进行全文检索与文件扫描。`,
    tags: ['学习', 'Rust'],
    mtime: 1719662500000,
  },
  {
    id: '学习笔记/React最佳实践.md',
    uuid: '1e23f456-789a-0123-4567-89abcdef0007',
    title: 'React最佳实践',
    content: `# React + TypeScript 最佳实践

在团队笔记的前端部分，我们使用 React 作为视图层。以下是一些编码准则。

## 状态设计
1. **最小状态原则**：不要将可计算的值放入 state。例如反向链接，应在渲染时从元数据或索引计算得到。
2. **单向数据流**：状态向上传递，属性（Props）向下分发。
3. **Zustand 状态管理**：利用 zustand 替代冗余的 context 以提高重渲染效率。

## 组件化编码建议
- 尽量将渲染逻辑与数据获取逻辑解耦。
- 编辑器推荐使用 Milkdown（见 [[项目概述]]）。`,
    tags: ['学习', 'React', '前端'],
    mtime: 1719662600000,
  }
];

export function buildFileTree(notes: MockNote[]): FileTreeNode[] {
  return buildFileTreeUtil(notes);
}
