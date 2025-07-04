"use client";

import { useState, useEffect, useRef, useCallback, createElement } from "react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import {
  FileNode,
  getFileExtension,
  getLanguageFromExtension,
  formatBytes,
} from "@/lib/file-utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  File,
  Copy,
  Check,
  X,
  Search,
  FileText,
  Code,
  Image,
  Archive,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabData {
  id: string;
  file: FileNode;
  content: string;
  isLoading: boolean;
  scrollPosition?: { line: number; column: number };
}

interface TabbedEditorProps {
  files: { file: FileNode; content: string }[];
  onFileDownload: (file: FileNode) => void;
  onSearchOpen: () => void;
  highlightLine?: number;
}

function getFileIcon(filename: string) {
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

  return iconMap[extension] || File;
}

export function TabbedEditor({
  files,
  onFileDownload,
  onSearchOpen,
  highlightLine,
}: TabbedEditorProps) {
  const { theme } = useTheme();
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const editorsRef = useRef<Record<string, any>>({});

  // Convert files to tabs
  useEffect(() => {
    const newTabs: TabData[] = files.map(({ file, content }) => ({
      id: file.path,
      file,
      content,
      isLoading: false,
    }));

    setTabs(newTabs);

    // Set active tab to the last opened file
    if (newTabs.length > 0) {
      const lastTab = newTabs[newTabs.length - 1];
      setActiveTab(lastTab.id);
    }
  }, [files]);

  // Handle line highlighting
  useEffect(() => {
    if (highlightLine && activeTab && editorsRef.current[activeTab]) {
      const editor = editorsRef.current[activeTab];

      // Go to line and highlight it
      editor.revealLineInCenter(highlightLine);
      editor.setPosition({ lineNumber: highlightLine, column: 1 });

      // Add decoration to highlight the line
      const decorations = editor.deltaDecorations(
        [],
        [
          {
            range: {
              startLineNumber: highlightLine,
              startColumn: 1,
              endLineNumber: highlightLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "search-highlight-line",
              glyphMarginClassName: "search-highlight-glyph",
            },
          },
        ]
      );

      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (editorsRef.current[activeTab]) {
          editorsRef.current[activeTab].deltaDecorations(decorations, []);
        }
      }, 3000);
    }
  }, [highlightLine, activeTab]);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prevTabs) => {
        const newTabs = prevTabs.filter((tab) => tab.id !== tabId);

        // If closing active tab, switch to another tab
        if (activeTab === tabId && newTabs.length > 0) {
          const currentIndex = prevTabs.findIndex((tab) => tab.id === tabId);
          const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
          setActiveTab(nextTab.id);
        } else if (newTabs.length === 0) {
          setActiveTab("");
        }

        return newTabs;
      });

      // Clean up editor reference
      delete editorsRef.current[tabId];
    },
    [activeTab]
  );

  const handleCopy = async (tabId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates((prev) => ({ ...prev, [tabId]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [tabId]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleEditorDidMount = (editor: any, tabId: string) => {
    editorsRef.current[tabId] = editor;

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 1.5,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      readOnly: true,
      wordWrap: "on",
      lineNumbers: "on",
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
    });

    // Add custom CSS for search highlighting
    const style = document.createElement("style");
    style.textContent = `
      .search-highlight-line {
        background-color: rgba(255, 255, 0, 0.2) !important;
      }
      .search-highlight-glyph {
        background-color: rgba(255, 255, 0, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No files open</h3>
          <p className="text-muted-foreground mb-4">
            Select files from the tree to open them in tabs
          </p>
          <Button variant="outline" onClick={onSearchOpen}>
            <Search className="w-4 h-4 mr-2" />
            Search Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        {/* Tab Bar */}
        <div className="border-b bg-card/50 px-1">
          <div className="flex items-center justify-between">
            <ScrollArea className="flex-1">
              <TabsList className="h-auto p-0.5 bg-transparent">
                {tabs.map((tab) => {
                  const Icon = getFileIcon(tab.file.name);
                  const extension = getFileExtension(tab.file.name);
                  const language = getLanguageFromExtension(extension);
                  const isBinaryFile = tab.content.startsWith("[Binary file");

                  return (
                    <div key={tab.id} className="relative group">
                      <TabsTrigger
                        value={tab.id}
                        className={cn(
                          "flex items-center space-x-1 px-2 py-1.5 text-sm max-w-[200px]",
                          "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{tab.file.name}</span>
                      </TabsTrigger>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100",
                          "hover:bg-destructive hover:text-destructive-foreground transition-all"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </TabsList>
            </ScrollArea>

            <div className="flex items-center space-x-1 px-2">
              <Button variant="outline" size="sm" onClick={onSearchOpen}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {tabs.map((tab) => {
          const extension = getFileExtension(tab.file.name);
          const language = getLanguageFromExtension(extension);
          const isBinaryFile = tab.content.startsWith("[Binary file");

          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 m-0 flex flex-col"
            >
              {/* File Header */}
              <div className="flex items-center justify-between p-3 border-b bg-card/50">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {createElement(getFileIcon(tab.file.name), {
                      className: "w-5 h-5 text-primary",
                    })}
                  </div>
                  <div>
                    <h3 className="font-medium">{tab.file.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tab.file.size
                        ? formatBytes(tab.file.size)
                        : "Unknown size"}{" "}
                      • {language}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(tab.id, tab.content)}
                    disabled={isBinaryFile}
                  >
                    {copiedStates[tab.id] ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copiedStates[tab.id] ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFileDownload(tab.file)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-hidden">
                {isBinaryFile ? (
                  <div className="p-4 h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">Binary File</p>
                      <p className="text-sm">Cannot preview binary content</p>
                      <p className="text-xs mt-2">
                        Use the download button to save the file
                      </p>
                    </div>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={language}
                    value={tab.content}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    onMount={(editor) => handleEditorDidMount(editor, tab.id)}
                    options={{
                      readOnly: true,
                      fontSize: 14,
                      lineHeight: 1.5,
                      minimap: { enabled: true },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                      lineNumbers: "on",
                      glyphMargin: true,
                      folding: true,
                      lineDecorationsWidth: 10,
                      lineNumbersMinChars: 3,
                    }}
                  />
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
