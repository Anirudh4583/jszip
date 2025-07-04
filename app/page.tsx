"use client";

import { useState, useCallback, useMemo } from "react";
import JSZip from "jszip";
import { FileUpload } from "@/components/file-upload";
import { FileTree } from "@/components/file-tree";
import { TabbedEditor } from "@/components/tabbed-editor";
import { SearchDialog } from "@/components/search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FileNode,
  parseArchive,
  getFileContent,
  downloadFile,
  formatBytes,
} from "@/lib/file-utils";
import { Archive, Folder, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [archive, setArchive] = useState<JSZip | null>(null);
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<
    { file: FileNode; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightLine, setHighlightLine] = useState<number | undefined>();

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const zip = new JSZip();
      const loadedArchive = await zip.loadAsync(file);
      const tree = await parseArchive(file);

      setArchive(loadedArchive);
      setArchiveFile(file);
      setFileTree(tree);
      setOpenFiles([]);
    } catch (error) {
      console.error("Error loading archive:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileTreeSelect = useCallback(
    async (node: FileNode) => {
      if (node.isDirectory || !archive) return;

      // Check if file is already open
      const existingFile = openFiles.find((f) => f.file.path === node.path);
      if (existingFile) {
        return; // File already open, tab switching is handled by TabbedEditor
      }

      try {
        const content = await getFileContent(archive, node.path);
        setOpenFiles((prev) => [...prev, { file: node, content }]);
      } catch (error) {
        console.error("Error loading file content:", error);
        setOpenFiles((prev) => [
          ...prev,
          { file: node, content: "[Error loading file content]" },
        ]);
      }
    },
    [archive, openFiles]
  );

  const handleFileDownload = useCallback(
    async (node: FileNode) => {
      if (!archive || node.isDirectory) return;

      try {
        const content = await getFileContent(archive, node.path);
        downloadFile(content, node.name);
      } catch (error) {
        console.error("Error downloading file:", error);
      }
    },
    [archive]
  );

  const handleSearchFileSelect = useCallback(
    async (file: FileNode, line?: number) => {
      if (!archive) return;

      // Check if file is already open
      const existingFile = openFiles.find((f) => f.file.path === file.path);
      if (!existingFile) {
        try {
          const content = await getFileContent(archive, file.path);
          setOpenFiles((prev) => [...prev, { file, content }]);
        } catch (error) {
          console.error("Error loading file content:", error);
          setOpenFiles((prev) => [
            ...prev,
            { file, content: "[Error loading file content]" },
          ]);
        }
      }

      // Set highlight line for the editor
      if (line) {
        setHighlightLine(line);
        // Clear highlight after a short delay to allow the editor to process it
        setTimeout(() => setHighlightLine(undefined), 100);
      }
    },
    [archive, openFiles]
  );

  const getFileContentForSearch = useCallback(
    async (path: string): Promise<string> => {
      if (!archive) return "";
      return getFileContent(archive, path);
    },
    [archive]
  );

  const totalFiles = useMemo(() => {
    const countFiles = (nodes: FileNode[]): number => {
      return nodes.reduce((count, node) => {
        if (node.isDirectory && node.children) {
          return count + countFiles(node.children);
        }
        return count + (node.isDirectory ? 0 : 1);
      }, 0);
    };
    return countFiles(fileTree);
  }, [fileTree]);

  const totalSize = useMemo(() => {
    const sumSize = (nodes: FileNode[]): number => {
      return nodes.reduce((size, node) => {
        if (node.isDirectory && node.children) {
          return size + sumSize(node.children);
        }
        return size + (node.size || 0);
      }, 0);
    };
    return sumSize(fileTree);
  }, [fileTree]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      {/* Header */}
      {/* <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Archive className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Archive Explorer</h1>
                <p className="text-sm text-muted-foreground">
                  Browse JAR & ZIP files with tabbed editor and search
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {archiveFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header> */}

      <main className="px-3 py-6">
        {!archiveFile ? (
          <div className="flex flex-col items-center justify-center min-h-fit space-y-8">
            <div className="text-center max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Explore Your Archives</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Upload a JAR or ZIP file to browse its contents with tabbed
                editor, syntax highlighting, and full-text search capabilities.
              </p>
            </div>

            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-center">
              <div className="p-4 rounded-lg bg-card/50 border">
                <Folder className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium mb-1">Tree Navigation</h3>
                <p className="text-sm text-muted-foreground">
                  Collapsible folder structure for easy browsing
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border">
                <FileText className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium mb-1">Tabbed Editor</h3>
                <p className="text-sm text-muted-foreground">
                  Multiple files open with syntax highlighting
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border">
                <Search className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-medium mb-1">Full-Text Search</h3>
                <p className="text-sm text-muted-foreground">
                  Search across all text files in the archive
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Archive Info */}
            <div className="bg-card/50 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Archive className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">
                      {archiveFile.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {totalFiles} files • {formatBytes(totalSize)} total •{" "}
                      {formatBytes(archiveFile.size)} compressed
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Files
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setArchive(null);
                      setArchiveFile(null);
                      setFileTree([]);
                      setOpenFiles([]);
                    }}
                  >
                    Upload New File
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-[80vh]">
              {/* File Tree */}
              <div className="lg:col-span-4 bg-card/50 rounded-lg border overflow-hidden">
                <div className="p-3 border-b">
                  <h3 className="font-medium">File Explorer</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalFiles} files in archive
                  </p>
                </div>
                <div className="p-1 max-h-[80vh] overflow-auto">
                  <FileTree
                    nodes={fileTree}
                    onFileSelect={handleFileTreeSelect}
                    onFileDownload={handleFileDownload}
                    selectedFile={openFiles[openFiles.length - 1]?.file.path}
                  />
                </div>
              </div>

              {/* Tabbed Editor */}
              <div className="lg:col-span-8 bg-card/50 rounded-lg border overflow-hidden">
                <TabbedEditor
                  files={openFiles}
                  onFileDownload={handleFileDownload}
                  onSearchOpen={() => setIsSearchOpen(true)}
                  highlightLine={highlightLine}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Search Dialog */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        fileTree={fileTree}
        onFileSelect={handleSearchFileSelect}
        getFileContent={getFileContentForSearch}
      />
    </div>
  );
}
