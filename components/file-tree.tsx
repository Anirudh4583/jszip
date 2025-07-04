"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Download,
  FileText,
  Image,
  Archive,
  Code,
  Database,
  Settings,
} from "lucide-react";
import { FileNode, formatBytes, getFileExtension } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileTreeProps {
  nodes: FileNode[];
  onFileSelect: (node: FileNode) => void;
  onFileDownload: (node: FileNode) => void;
  selectedFile?: string;
  level?: number;
}

function getFileIcon(filename: string, isDirectory: boolean) {
  if (isDirectory) return { icon: Folder, openIcon: FolderOpen };

  const extension = getFileExtension(filename);

  const iconMap: Record<string, any> = {
    // Code files
    js: Code,
    jsx: Code,
    ts: Code,
    tsx: Code,
    java: Code,
    kt: Code,
    py: Code,
    rb: Code,
    php: Code,
    cpp: Code,
    c: Code,
    cs: Code,
    go: Code,
    rs: Code,
    // Images
    jpg: Image,
    jpeg: Image,
    png: Image,
    gif: Image,
    svg: Image,
    ico: Image,
    // Archives
    zip: Archive,
    jar: Archive,
    tar: Archive,
    gz: Archive,
    rar: Archive,
    // Data/Config
    json: Database,
    xml: Database,
    yml: Database,
    yaml: Database,
    toml: Database,
    sql: Database,
    db: Database,
    // Config files
    ini: Settings,
    cfg: Settings,
    conf: Settings,
    properties: Settings,
    gradle: Settings,
    pom: Settings,
    maven: Settings,
    // Text files
    md: FileText,
    txt: FileText,
    log: FileText,
    readme: FileText,
  };

  return { icon: iconMap[extension] || File };
}

function FileTreeNode({
  node,
  onFileSelect,
  onFileDownload,
  selectedFile,
  level = 0,
}: {
  node: FileNode;
  onFileSelect: (node: FileNode) => void;
  onFileDownload: (node: FileNode) => void;
  selectedFile?: string;
  level: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [childExpansions, setChildExpansions] = useState<
    Record<string, boolean>
  >({});
  const isSelected = selectedFile === node.path;
  const { icon: Icon, openIcon: OpenIcon } = getFileIcon(
    node.name,
    node.isDirectory
  );
  const DisplayIcon = node.isDirectory
    ? isExpanded && OpenIcon
      ? OpenIcon
      : Icon
    : Icon;

  // Auto-expand single subdirectories when this directory is expanded
  useEffect(() => {
    if (isExpanded && node.isDirectory && node.children) {
      const newExpansions: Record<string, boolean> = {};

      // Check each child to see if it should auto-expand
      node.children.forEach((child) => {
        if (
          child.isDirectory &&
          child.children &&
          child.children.length === 1 &&
          child.children[0].isDirectory
        ) {
          newExpansions[child.path] = true;
        }
      });

      setChildExpansions(newExpansions);
    } else {
      setChildExpansions({});
    }
  }, [isExpanded, node]);

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileDownload(node);
  };

  const handleChildExpansionChange = (childPath: string, expanded: boolean) => {
    setChildExpansions((prev) => ({
      ...prev,
      [childPath]: expanded,
    }));
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200",
          "hover:bg-accent/50 group",
          isSelected && "bg-primary/10 border border-primary/20",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex-shrink-0">
          <DisplayIcon
            className={cn(
              "w-4 h-4",
              node.isDirectory
                ? "text-blue-500 dark:text-blue-400"
                : "text-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "truncate text-sm",
                isSelected && "font-medium text-primary"
              )}
            >
              {node.name}
            </span>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {node.size !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {formatBytes(node.size)}
                </span>
              )}
              {!node.isDirectory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleDownload}
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div className="transition-all duration-200">
          {node.children.map((child, index) => (
            <FileTreeNodeWithAutoExpand
              key={`${child.path}-${index}`}
              node={child}
              onFileSelect={onFileSelect}
              onFileDownload={onFileDownload}
              selectedFile={selectedFile}
              level={level + 1}
              forceExpanded={childExpansions[child.path] || false}
              onExpansionChange={handleChildExpansionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreeNodeWithAutoExpand({
  node,
  onFileSelect,
  onFileDownload,
  selectedFile,
  level = 0,
  forceExpanded = false,
  onExpansionChange,
}: {
  node: FileNode;
  onFileSelect: (node: FileNode) => void;
  onFileDownload: (node: FileNode) => void;
  selectedFile?: string;
  level: number;
  forceExpanded?: boolean;
  onExpansionChange?: (path: string, expanded: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);
  const isSelected = selectedFile === node.path;
  const { icon: Icon, openIcon: OpenIcon } = getFileIcon(
    node.name,
    node.isDirectory
  );
  const DisplayIcon = node.isDirectory
    ? isExpanded && OpenIcon
      ? OpenIcon
      : Icon
    : Icon;

  // Update expansion state when forceExpanded changes
  useEffect(() => {
    if (forceExpanded && !isExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  const handleClick = () => {
    if (node.isDirectory) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onExpansionChange?.(node.path, newExpanded);
    } else {
      onFileSelect(node);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileDownload(node);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200",
          "hover:bg-accent/50 group",
          isSelected && "bg-primary/10 border border-primary/20",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex-shrink-0">
          <DisplayIcon
            className={cn(
              "w-4 h-4",
              node.isDirectory
                ? "text-blue-500 dark:text-blue-400"
                : "text-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "truncate text-sm",
                isSelected && "font-medium text-primary"
              )}
            >
              {node.name}
            </span>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {node.size !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {formatBytes(node.size)}
                </span>
              )}
              {!node.isDirectory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleDownload}
                >
                  <Download className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div className="transition-all duration-200">
          {node.children.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              onFileSelect={onFileSelect}
              onFileDownload={onFileDownload}
              selectedFile={selectedFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  nodes,
  onFileSelect,
  onFileDownload,
  selectedFile,
  level = 0,
}: FileTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No files found in archive</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node, index) => (
        <FileTreeNode
          key={`${node.path}-${index}`}
          node={node}
          onFileSelect={onFileSelect}
          onFileDownload={onFileDownload}
          selectedFile={selectedFile}
          level={level}
        />
      ))}
    </div>
  );
}
