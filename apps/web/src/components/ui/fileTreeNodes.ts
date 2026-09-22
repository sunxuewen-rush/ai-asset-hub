import type { VersionFileEntry } from '../../../api/types.js';

export interface FileNode {
  type: 'dir' | 'file';
  name: string;
  /** dir 子节点 */
  children?: FileNode[];
  /** file 原始条目（dir 无） */
  entry?: VersionFileEntry;
  /** 全路径（dir/file 均含——折叠键/点击路径用） */
  path: string;
}

/** 文件字节 → 人类可读（demo 12.4 KB 形态；KB/MB 一档小数） */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** sha256 → 8 位截断徽章形态（demo a3f9…c2d1） */
export function formatSha(sha: string): string {
  return sha.length > 12 ? `${sha.slice(0, 4)}…${sha.slice(-4)}` : sha;
}

/** 目录计数（含嵌套文件） */
export function dirFileCount(node: FileNode): number {
  if (node.type === 'file') return 1;
  return (node.children ?? []).reduce((sum, child) => sum + dirFileCount(child), 0);
}

/**
 * 文件清单（平铺 filePath）→ 目录树：
 * 隐含目录逐级补齐（a/b/c.md → dirs a、a/b）；同层目录前、文件后，各按名序。
 */
export function buildFileTree(files: readonly VersionFileEntry[]): FileNode[] {
  const dirMap = new Map<string, FileNode>();
  const getDir = (path: string, name: string): FileNode => {
    const hit = dirMap.get(path);
    if (hit) return hit;
    const node: FileNode = { type: 'dir', name, path, children: [] };
    dirMap.set(path, node);
    return node;
  };
  const root = getDir('', '');

  // 1) 每文件路径的每级前缀都建目录（祖先链完整）
  for (const entry of files) {
    const parts = entry.filePath.split('/');
    for (let depth = 1; depth < parts.length; depth++) {
      const segment = parts[depth - 1];
      if (segment === undefined) continue;
      getDir(parts.slice(0, depth).join('/'), segment);
    }
  }
  // 2) 目录挂父 + 文件挂父
  for (const node of dirMap.values()) {
    if (node.path === '') continue;
    const parentPath = node.path.split('/').slice(0, -1).join('/');
    const parent = dirMap.get(parentPath);
    if (!parent?.children) continue;
    parent.children.push(node);
  }
  for (const entry of files) {
    const parts = entry.filePath.split('/');
    const parent = dirMap.get(parts.slice(0, -1).join('/')) ?? root;
    const name = parts.at(-1);
    if (name === undefined || !parent.children) continue;
    parent.children.push({ type: 'file', name, path: entry.filePath, entry });
  }
  // 3) 同层排序：目录前文件后，各按名序
  const sortLevel = (nodes: FileNode[]) => {
    nodes.sort((x, y) =>
      x.type === y.type ? x.name.localeCompare(y.name) : x.type === 'dir' ? -1 : 1,
    );
    for (const node of nodes) {
      if (node.children) sortLevel(node.children);
    }
  };
  sortLevel(root.children ?? []);
  return root.children ?? [];
}
