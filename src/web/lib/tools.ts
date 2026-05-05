import {
  FileText, Merge, Split, Minimize2, FileOutput, Image, RotateCw, Droplets,
  Maximize2, RefreshCw, Eraser, Crop,
  FileSpreadsheet, Presentation,
  Braces, FileJson, FileCode,
  Video, Music, FileAudio,
  Type, CaseSensitive, AlignLeft,
  Lock, Unlock, QrCode, Binary, Palette, Hash, Clock,
  FileImage, Code, BookMarked,
} from "lucide-react";

export type ToolCategory = "pdf" | "image" | "document" | "data" | "video-audio" | "text" | "markdown";

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: any;
  processing: "client" | "server";
  acceptedTypes: string;
}

export interface Category {
  id: ToolCategory;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const categories: Category[] = [
  { id: "pdf", name: "PDF Tools", description: "Merge, split, compress and convert PDFs", color: "#c05746", bgColor: "rgba(192,87,70,0.08)", borderColor: "rgba(192,87,70,0.15)" },
  { id: "image", name: "Image Tools", description: "Compress, resize, convert and edit images", color: "#2d7a5f", bgColor: "rgba(45,122,95,0.08)", borderColor: "rgba(45,122,95,0.15)" },
  { id: "document", name: "Document Tools", description: "Convert documents to PDF and back", color: "#d4943a", bgColor: "rgba(212,148,58,0.08)", borderColor: "rgba(212,148,58,0.15)" },
  { id: "data", name: "Data Tools", description: "Convert between JSON, CSV, XML and YAML", color: "#3b82a0", bgColor: "rgba(59,130,160,0.08)", borderColor: "rgba(59,130,160,0.15)" },
  { id: "video-audio", name: "Video & Audio", description: "Compress, convert and extract media", color: "#7c5db8", bgColor: "rgba(124,93,184,0.08)", borderColor: "rgba(124,93,184,0.15)" },
  { id: "markdown", name: "Markdown", description: "Convert and export Markdown documents", color: "#1f6feb", bgColor: "rgba(31,111,235,0.08)", borderColor: "rgba(31,111,235,0.15)" },
  { id: "text", name: "Text Tools", description: "Count words, change case, generate text and more", color: "#6b7280", bgColor: "rgba(107,114,128,0.08)", borderColor: "rgba(107,114,128,0.15)" },
];

export const tools: Tool[] = [
  // PDF Tools (9)
  { id: "merge-pdf", name: "Merge PDF", description: "Combine multiple PDF files into one document", category: "pdf", icon: Merge, processing: "client", acceptedTypes: ".pdf" },
  { id: "split-pdf", name: "Split PDF", description: "Extract pages from a PDF into separate files", category: "pdf", icon: Split, processing: "client", acceptedTypes: ".pdf" },
  { id: "compress-pdf", name: "Compress PDF", description: "Reduce PDF file size while keeping quality", category: "pdf", icon: Minimize2, processing: "client", acceptedTypes: ".pdf" },
  { id: "pdf-to-image", name: "PDF to Image", description: "Convert PDF pages to PNG or JPG images", category: "pdf", icon: Image, processing: "client", acceptedTypes: ".pdf" },
  { id: "rotate-pdf", name: "Rotate PDF", description: "Rotate PDF pages to any angle", category: "pdf", icon: RotateCw, processing: "client", acceptedTypes: ".pdf" },
  { id: "watermark-pdf", name: "Watermark PDF", description: "Add text watermark to your PDF pages", category: "pdf", icon: Droplets, processing: "client", acceptedTypes: ".pdf" },
  { id: "pdf-to-word", name: "PDF to Word", description: "Convert PDF documents to editable Word files", category: "pdf", icon: FileOutput, processing: "client", acceptedTypes: ".pdf" },
  { id: "image-to-pdf", name: "Image to PDF", description: "Convert images to a PDF document", category: "pdf", icon: FileImage, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp,.gif" },
  { id: "protect-pdf", name: "Protect PDF", description: "Add password protection to your PDF files", category: "pdf", icon: Lock, processing: "client", acceptedTypes: ".pdf" },

  // Image Tools (5)
  { id: "compress-image", name: "Compress Image", description: "Reduce image file size without losing quality", category: "image", icon: Minimize2, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp" },
  { id: "resize-image", name: "Resize Image", description: "Change image dimensions to any size", category: "image", icon: Maximize2, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp,.gif" },
  { id: "convert-image", name: "Convert Image", description: "Convert between PNG, JPG, WebP and more", category: "image", icon: RefreshCw, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp,.gif,.bmp" },
  { id: "remove-bg", name: "Remove Background", description: "Remove background from images automatically", category: "image", icon: Eraser, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp" },
  { id: "crop-image", name: "Crop Image", description: "Crop images to custom dimensions", category: "image", icon: Crop, processing: "client", acceptedTypes: ".jpg,.jpeg,.png,.webp,.gif" },

  // Document Tools (3)
  { id: "word-to-pdf", name: "Word to PDF", description: "Convert Word documents to PDF format", category: "document", icon: FileText, processing: "server", acceptedTypes: ".doc,.docx" },
  { id: "excel-to-pdf", name: "Excel to PDF", description: "Convert Excel spreadsheets to PDF", category: "document", icon: FileSpreadsheet, processing: "server", acceptedTypes: ".xls,.xlsx" },
  { id: "ppt-to-pdf", name: "PPT to PDF", description: "Convert PowerPoint presentations to PDF", category: "document", icon: Presentation, processing: "server", acceptedTypes: ".ppt,.pptx" },

  // Data Tools (5)
  { id: "json-to-csv", name: "JSON to CSV", description: "Convert JSON data to CSV spreadsheet format", category: "data", icon: Braces, processing: "client", acceptedTypes: ".json" },
  { id: "csv-to-json", name: "CSV to JSON", description: "Convert CSV files to structured JSON", category: "data", icon: FileJson, processing: "client", acceptedTypes: ".csv" },
  { id: "xml-to-json", name: "XML to JSON", description: "Convert XML documents to JSON format", category: "data", icon: FileCode, processing: "client", acceptedTypes: ".xml" },
  { id: "json-to-yaml", name: "JSON to YAML", description: "Convert JSON to YAML and vice versa", category: "data", icon: FileJson, processing: "client", acceptedTypes: ".json,.yaml,.yml" },
  { id: "base64", name: "Base64 Encode/Decode", description: "Encode text or files to Base64 and back", category: "data", icon: Binary, processing: "client", acceptedTypes: "" },
  { id: "markdown-to-html", name: "Markdown to HTML", description: "Convert Markdown text to clean HTML", category: "data", icon: Code, processing: "client", acceptedTypes: ".md" },

  // Video/Audio Tools (4)
  { id: "compress-video", name: "Compress Video", description: "Reduce video file size for sharing", category: "video-audio", icon: Video, processing: "server", acceptedTypes: ".mp4,.mov,.avi,.mkv,.webm" },
  { id: "convert-video", name: "Convert Video", description: "Convert between video formats", category: "video-audio", icon: RefreshCw, processing: "server", acceptedTypes: ".mp4,.mov,.avi,.mkv,.webm" },
  { id: "extract-audio", name: "Extract Audio", description: "Extract audio track from video files", category: "video-audio", icon: Music, processing: "server", acceptedTypes: ".mp4,.mov,.avi,.mkv,.webm" },
  { id: "extract-text-from-audio", name: "Extract Text from Audio", description: "Transcribe spoken audio to text from MP3 or M4A files", category: "video-audio", icon: FileAudio, processing: "server", acceptedTypes: ".mp3,.m4a" },

  // Markdown Tools (1)
  { id: "markdown-to-pdf", name: "Markdown to PDF", description: "Convert Markdown to PDF using GitHub-flavored styling", category: "markdown", icon: BookMarked, processing: "client", acceptedTypes: ".md,.markdown" },

  // Text Tools (7)
  { id: "word-counter", name: "Word Counter", description: "Count words, characters, sentences and paragraphs", category: "text", icon: Type, processing: "client", acceptedTypes: "" },
  { id: "case-converter", name: "Case Converter", description: "Convert text to uppercase, lowercase, title case", category: "text", icon: CaseSensitive, processing: "client", acceptedTypes: "" },
  { id: "lorem-generator", name: "Lorem Generator", description: "Generate placeholder lorem ipsum text", category: "text", icon: AlignLeft, processing: "client", acceptedTypes: "" },
  { id: "qr-generator", name: "QR Code Generator", description: "Generate QR codes from any text or URL", category: "text", icon: QrCode, processing: "client", acceptedTypes: "" },
  { id: "hash-generator", name: "Hash Generator", description: "Generate MD5, SHA-1, SHA-256 hashes from text", category: "text", icon: Hash, processing: "client", acceptedTypes: "" },
  { id: "color-converter", name: "Color Converter", description: "Convert between HEX, RGB, HSL color formats", category: "text", icon: Palette, processing: "client", acceptedTypes: "" },
  { id: "timestamp-converter", name: "Timestamp Converter", description: "Convert between Unix timestamps and dates", category: "text", icon: Clock, processing: "client", acceptedTypes: "" },
];

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

export function getCategoryById(id: ToolCategory): Category | undefined {
  return categories.find((c) => c.id === id);
}
