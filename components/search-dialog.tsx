"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, X, ChevronRight } from "lucide-react";
import { FileNode, getFileExtension } from "@/lib/file-utils";
import { cn } from "@/lib/utils";

interface SearchResult {
  file: FileNode;
  matches: {
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }[];
}

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileTree: FileNode[];
  onFileSelect: (file: FileNode, line?: number) => void;
  getFileContent: (path: string) => Promise<string>;
}

export function SearchDialog({
  isOpen,
  onClose,
  fileTree,
  onFileSelect,
  getFileContent,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState({ files: 0, matches: 0 });

  const textFiles = useMemo(() => {
    const collectTextFiles = (nodes: FileNode[]): FileNode[] => {
      const files: FileNode[] = [];

      for (const node of nodes) {
        if (node.isDirectory && node.children) {
          files.push(...collectTextFiles(node.children));
        } else if (!node.isDirectory) {
          const ext = getFileExtension(node.name);
          const textExtensions = [
            "js",
            "jsx",
            "ts",
            "tsx",
            "java",
            "kt",
            "py",
            "rb",
            "php",
            "cpp",
            "c",
            "cs",
            "go",
            "rs",
            "html",
            "htm",
            "xml",
            "css",
            "scss",
            "sass",
            "less",
            "json",
            "yaml",
            "yml",
            "toml",
            "md",
            "txt",
            "log",
            "ini",
            "cfg",
            "conf",
            "properties",
            "gradle",
            "sql",
            "sh",
            "bash",
            "dockerfile",
            "makefile",
            "gitignore",
            "readme",
          ];

          if (
            textExtensions.includes(ext) ||
            node.name.toLowerCase().includes("readme") ||
            node.name.toLowerCase().includes("license") ||
            node.name.toLowerCase().includes("changelog")
          ) {
            files.push(node);
          }
        }
      }

      return files;
    };

    return collectTextFiles(fileTree);
  }, [fileTree]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || textFiles.length === 0) {
      setResults([]);
      setSearchStats({ files: 0, matches: 0 });
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];
    let totalMatches = 0;

    try {
      for (const file of textFiles) {
        try {
          const content = await getFileContent(file.path);
          if (
            content.startsWith("[Binary file") ||
            content.startsWith("[Unable to read")
          ) {
            continue;
          }

          const lines = content.split("\n");
          const matches: SearchResult["matches"] = [];
          const regex = new RegExp(
            searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "gi"
          );

          lines.forEach((line, index) => {
            let match;
            while ((match = regex.exec(line)) !== null) {
              matches.push({
                line: index + 1,
                content: line.trim(),
                matchStart: match.index,
                matchEnd: match.index + match[0].length,
              });
              totalMatches++;
            }
          });

          if (matches.length > 0) {
            searchResults.push({ file, matches });
          }
        } catch (error) {
          console.warn(`Failed to search in ${file.path}:`, error);
        }
      }

      setResults(searchResults);
      setSearchStats({ files: searchResults.length, matches: totalMatches });
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, textFiles]);

  const handleResultClick = (
    result: SearchResult,
    match: SearchResult["matches"][0]
  ) => {
    onFileSelect(result.file, match.line);
    onClose();
  };

  const highlightMatch = (
    content: string,
    matchStart: number,
    matchEnd: number
  ) => {
    const before = content.slice(0, matchStart);
    const match = content.slice(matchStart, matchEnd);
    const after = content.slice(matchEnd);

    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {match}
        </mark>
        {after}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Search in Archive</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for text in files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {query && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>
                  {searchStats.matches} matches in {searchStats.files} files
                </span>
                {isSearching && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full" />
                    <span>Searching...</span>
                  </div>
                )}
              </div>
              <Badge variant="outline">
                {textFiles.length} searchable files
              </Badge>
            </div>
          )}

          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2 space-y-2">
              {results.length === 0 && query && !isSearching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No matches found for &quot;{query}&quot;</p>
                </div>
              ) : (
                results.map((result, resultIndex) => (
                  <div
                    key={`${result.file.path}-${resultIndex}`}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {result.file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.file.path}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {result.matches.length} matches
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {result.matches.slice(0, 5).map((match, matchIndex) => (
                        <button
                          key={`${result.file.path}-${match.line}-${matchIndex}`}
                          className={cn(
                            "w-full text-left p-2 rounded border hover:bg-accent/50 transition-colors",
                            "text-sm font-mono"
                          )}
                          onClick={() => handleResultClick(result, match)}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                              {match.line}:
                            </span>
                            <div className="flex-1 truncate">
                              {highlightMatch(
                                match.content,
                                match.matchStart,
                                match.matchEnd
                              )}
                            </div>
                            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                          </div>
                        </button>
                      ))}

                      {result.matches.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          ... and {result.matches.length - 5} more matches
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
