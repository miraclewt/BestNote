export interface NoteMetadata {
  id: string;            // Relative path, unique identifier
  uuid: string;          // UUID v4
  title: string;         // Document title
  path: string;          // Absolute path
  relativePath: string;  // Relative path to vault
  tags: string[];        // Extracted tags
  links: string[];       // WikiLink targets
  createdAt: number;     // Timestamp
  modifiedAt: number;    // Timestamp
  size: number;          // Bytes
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

export interface AppConfig {
  recentVaults: string[];
  currentVault: string | null;
  editorMode: 'split' | 'wysiwyg';
  imageDir: string;
  ai: {
    endpoint: string;
    model: string;
    encryptedApiKey: string | null;
  } | null;
  theme: 'light' | 'dark' | 'system';
}

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  oldPath?: string;
}

export interface SearchQuery {
  text: string;
  tag?: string;
  path?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  path: string;
  snippet: string;
  score: number;
  tags: string[];
}

export interface FileWithMeta {
  content: string;
  mtime: number;
  size: number;
}
