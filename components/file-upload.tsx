"use client";

import { useCallback, useState } from "react";
import { Upload, FileArchive, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const validExtensions = [".jar", ".zip"];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(extension)) {
      setError("Please select a .jar or .zip file");
      return false;
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      setError("File size must be less than 100MB");
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      if (file && validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragOver && "border-primary bg-primary/10 scale-105",
          isLoading && "opacity-50 pointer-events-none",
          "dark:border-gray-700 dark:hover:border-primary/50",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".jar,.zip"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center space-y-4">
          <div
            className={cn(
              "p-4 rounded-full transition-colors",
              isDragOver
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {isLoading ? (
              <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isLoading ? "Processing archive..." : "Upload your archive"}
            </h3>
            <p className="text-muted-foreground">
              Drag and drop a .jar or .zip file here, or click to browse
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <FileArchive className="w-4 h-4" />
              <span>Supports .jar and .zip files up to 100MB</span>
            </div>
          </div>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-primary/20 rounded-xl flex items-center justify-center">
            <div className="text-primary font-semibold">
              Drop your file here
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
          <X className="w-4 h-4 text-destructive" />
          <span className="text-destructive text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
