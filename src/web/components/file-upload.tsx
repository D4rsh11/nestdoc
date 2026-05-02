import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Plus } from "lucide-react";

interface FileUploadProps {
  acceptedTypes: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
}

export function FileUpload({
  acceptedTypes,
  multiple = false,
  onFilesSelected,
  files,
  onRemoveFile,
  maxFiles = 20,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) {
        onFilesSelected(multiple ? dropped.slice(0, maxFiles) : [dropped[0]]);
      }
    },
    [onFilesSelected, multiple, maxFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 0) {
        onFilesSelected(multiple ? selected.slice(0, maxFiles) : [selected[0]]);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFilesSelected, multiple, maxFiles]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (files.length > 0) {
    return (
      <div className="space-y-3">
        <div className="grid gap-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-secondary rounded-lg px-4 py-3 border border-border"
            >
              <FileText className="w-5 h-5 text-[#1e3a5f] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => onRemoveFile(i)}
                className="p-1.5 hover:bg-card rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        {multiple && files.length < maxFiles && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-[#1e3a5f] hover:text-[#3d9e7a] font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add more files
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 p-10 sm:p-14 text-center ${
        isDragging
          ? "border-[#1e3a5f] bg-[#1e3a5f]/5 animate-pulse-border"
          : "border-border hover:border-[#1e3a5f]/50 hover:bg-secondary/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
          isDragging ? "bg-[#1e3a5f]/10" : "bg-secondary"
        }`}>
          <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-[#1e3a5f]" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="font-semibold text-foreground font-sans">
            {isDragging ? "Drop your files here" : "Drag & drop your files here"}
          </p>
          <p className="text-sm text-muted-foreground mt-1.5">
            or <span className="text-[#1e3a5f] font-medium">browse files</span> from your computer
          </p>
        </div>
        {acceptedTypes && (
          <p className="text-xs text-muted-foreground/70">
            Accepted: {acceptedTypes.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")}
          </p>
        )}
      </div>
    </div>
  );
}
