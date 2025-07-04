"use client";

import { useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { FileNode, getFileExtension, getLanguageFromExtension, formatBytes } from '@/lib/file-utils';
import { Button } from '@/components/ui/button';
import { Download, File, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FilePreviewProps {
  file: FileNode;
  content: string;
  onDownload: () => void;
}

export function FilePreview({ file, content, onDownload }: FilePreviewProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);

  const extension = getFileExtension(file.name);
  const language = getLanguageFromExtension(extension);
  const isBinaryFile = content.startsWith('[Binary file');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 1.5,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      readOnly: true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center space-x-3">
          <File className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">{file.name}</h3>
            <p className="text-sm text-muted-foreground">
              {file.size ? formatBytes(file.size) : 'Unknown size'} • {language}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={isBinaryFile}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isBinaryFile ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Binary File</p>
              <p className="text-sm">Cannot preview binary content</p>
              <p className="text-xs mt-2">Use the download button to save the file</p>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={content}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              fontSize: 14,
              lineHeight: 1.5,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
            }}
          />
        )}
      </div>
    </div>
  );
}