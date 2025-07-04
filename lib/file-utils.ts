import JSZip from "jszip";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  content?: string;
  children?: FileNode[];
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    java: "java",
    kt: "kotlin",
    py: "python",
    rb: "ruby",
    php: "php",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    ps1: "powershell",
    sql: "sql",
    html: "html",
    htm: "html",
    xml: "xml",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
    conf: "ini",
    md: "markdown",
    markdown: "markdown",
    txt: "plaintext",
    log: "plaintext",
    gitignore: "plaintext",
    dockerfile: "dockerfile",
    makefile: "makefile",
    gradle: "groovy",
    groovy: "groovy",
    scala: "scala",
    clj: "clojure",
    cljs: "clojure",
    r: "r",
    matlab: "matlab",
    m: "matlab",
    pl: "perl",
    lua: "lua",
    dart: "dart",
    swift: "swift",
    vim: "vim",
    properties: "properties",
  };

  return languageMap[extension] || "plaintext";
}

export async function parseArchive(file: File): Promise<FileNode[]> {
  const zip = new JSZip();
  const archive = await zip.loadAsync(file);
  const fileTree: Map<string, FileNode> = new Map();

  // First pass: create all directories
  archive.forEach((relativePath, zipEntry) => {
    const parts = relativePath.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === "") continue;

      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!fileTree.has(currentPath)) {
        const isDirectory = i < parts.length - 1 || zipEntry.dir;
        const node: FileNode = {
          name: part,
          path: currentPath,
          isDirectory,
          children: isDirectory ? [] : undefined,
          // @ts-ignore
          size: isDirectory ? undefined : zipEntry._data?.uncompressedSize || 0,
        };

        fileTree.set(currentPath, node);

        // Add to parent's children
        if (parentPath && fileTree.has(parentPath)) {
          const parent = fileTree.get(parentPath)!;
          if (
            parent.children &&
            !parent.children.some((child) => child.path === currentPath)
          ) {
            parent.children.push(node);
          }
        }
      }
    }
  });

  // Return root level nodes
  const rootNodes: FileNode[] = [];
  fileTree.forEach((node, path) => {
    if (!path.includes("/")) {
      rootNodes.push(node);
    }
  });

  // Sort directories first, then files
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }));
  };

  return sortNodes(rootNodes);
}

export async function getFileContent(
  archive: JSZip,
  filePath: string
): Promise<string> {
  const file = archive.file(filePath);
  if (!file) throw new Error("File not found");

  try {
    const content = await file.async("string");
    return content;
  } catch (error) {
    // If string parsing fails, try as binary and convert to base64
    try {
      const binaryContent = await file.async("arraybuffer");
      const bytes = new Uint8Array(binaryContent);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `[Binary file - ${formatBytes(
        binaryContent.byteLength
      )}]\n\nBase64 content:\n${btoa(binary)}`;
    } catch {
      return "[Unable to read file content]";
    }
  }
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
