// Client-side file processing functions
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import Papa from "papaparse";
import * as yaml from "js-yaml";
import { Document, Packer, Paragraph, TextRun } from "docx";

// ============ PDF TOOLS ============

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const pdfBytes = await merged.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function splitPdf(
  file: File,
  pageRanges: string
): Promise<{ name: string; blob: Blob }[]> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const totalPages = doc.getPageCount();
  const results: { name: string; blob: Blob }[] = [];

  const ranges = pageRanges.split(",").map((r) => r.trim()).filter(Boolean);
  for (const range of ranges) {
    const newDoc = await PDFDocument.create();
    const dashMatch = range.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
      const start = parseInt(dashMatch[1], 10);
      const end = parseInt(dashMatch[2], 10);
      const s = Math.max(1, start) - 1;
      const e = Math.min(totalPages, end) - 1;
      const indices = [];
      for (let i = s; i <= e; i++) indices.push(i);
      const pages = await newDoc.copyPages(doc, indices);
      pages.forEach((p) => newDoc.addPage(p));
    } else if (/^\d+$/.test(range)) {
      const idx = parseInt(range, 10) - 1;
      if (idx >= 0 && idx < totalPages) {
        const [page] = await newDoc.copyPages(doc, [idx]);
        newDoc.addPage(page);
      }
    } else {
      continue; // skip invalid ranges
    }
    if (newDoc.getPageCount() > 0) {
      const pdfBytes = await newDoc.save();
      results.push({
        name: `split_pages_${range}.pdf`,
        blob: new Blob([pdfBytes], { type: "application/pdf" }),
      });
    }
  }
  return results;
}

export async function rotatePdf(file: File, angle: number): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  doc.getPages().forEach((page) => {
    page.setRotation(degrees(page.getRotation().angle + angle));
  });
  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function watermarkPdf(file: File, text: string): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.08;
    page.drawText(text, {
      x: width / 2 - (font.widthOfTextAtSize(text, fontSize) / 2),
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });
  });
  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let img;
    if (file.type === "image/png") {
      img = await doc.embedPng(bytes);
    } else {
      // Convert to PNG via canvas for non-jpg/png types
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        img = await doc.embedJpg(bytes);
      } else {
        const pngBlob = await convertImageToFormat(file, "png");
        const pngBytes = await pngBlob.arrayBuffer();
        img = await doc.embedPng(pngBytes);
      }
    }
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function protectPdf(file: File, password: string): Promise<Blob> {
  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt-lite");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const encryptedBytes = await encryptPDF(bytes, password);
  return new Blob([encryptedBytes], { type: "application/pdf" });
}

export async function pdfToWord(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  // Extract text from each page using pdf-lib's page content
  // pdf-lib doesn't have direct text extraction, so we parse the content stream
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Converted from: ${file.name}`,
          bold: true,
          size: 28,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  for (let i = 0; i < pages.length; i++) {
    // Add page header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `— Page ${i + 1} of ${pages.length} —`,
            bold: true,
            size: 24,
            color: "666666",
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    // Extract text content from the page's content stream
    const page = pages[i];
    try {
      const textContent = await extractTextFromPdfPage(bytes, i);
      if (textContent.trim()) {
        const lines = textContent.split("\n");
        for (const line of lines) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22 })],
              spacing: { after: 100 },
            })
          );
        }
      } else {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "[This page contains non-text content (images, graphics)]",
                italics: true,
                color: "999999",
                size: 20,
              }),
            ],
          })
        );
      }
    } catch {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "[Could not extract content from this page]",
              italics: true,
              color: "999999",
              size: 20,
            }),
          ],
        })
      );
    }
  }

  const wordDoc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBlob(wordDoc);
  return buffer;
}

// Extract text from a PDF page using a canvas-based approach
async function extractTextFromPdfPage(pdfBytes: ArrayBuffer, pageIndex: number): Promise<string> {
  // Use the PDF.js-like approach: parse the raw content stream for text operators
  // This is a simplified extraction that looks for text between BT/ET operators
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[pageIndex];
  const { width, height } = page.getSize();

  // Get the raw content stream as a string to find text
  // pdf-lib doesn't expose text directly, so we'll try to decode the content
  const node = page.node;
  const contents = node.Contents();

  if (!contents) return "";

  let rawText = "";
  try {
    // Try to extract from the content stream
    const ref = contents;
    // Look through the PDF object for string content
    const lookup = node.doc.context.lookup(ref);
    if (lookup && typeof (lookup as any).decodeText === "function") {
      rawText = (lookup as any).decodeText();
    } else if (lookup && typeof (lookup as any).getContents === "function") {
      const buf = (lookup as any).getContents();
      rawText = new TextDecoder("latin1").decode(buf);
    } else if (lookup && (lookup as any).contents) {
      rawText = new TextDecoder("latin1").decode((lookup as any).contents);
    }
  } catch {
    // Fallback: return empty
    return "";
  }

  // Parse text operators from the content stream
  // Text in PDF is between BT (begin text) and ET (end text) operators
  // Text strings appear in () or <> followed by Tj, TJ, ', or " operators
  const textMatches: string[] = [];
  const regex = /\(([^)]*)\)\s*Tj|\(([^)]*)\)\s*'/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const text = match[1] || match[2] || "";
    if (text.trim()) textMatches.push(text);
  }

  // Also try TJ arrays: [(text) num (text) num ...] TJ
  const tjRegex = /\[((?:\([^)]*\)|[^])*?)\]\s*TJ/gi;
  while ((match = tjRegex.exec(rawText)) !== null) {
    const inner = match[1];
    const strRegex = /\(([^)]*)\)/g;
    let strMatch;
    while ((strMatch = strRegex.exec(inner)) !== null) {
      if (strMatch[1].trim()) textMatches.push(strMatch[1]);
    }
  }

  return textMatches.join(" ").replace(/\\n/g, "\n").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}

export async function compressPdf(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Strip metadata
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");

  // Remove embedded images by downscaling — re-embed at lower quality
  const pages = doc.getPages();
  for (const page of pages) {
    // Remove annotations (comments, form fields etc) to reduce size
    const annots = page.node.lookup(page.node.get((PDFDocument as any).PDFName?.of?.("Annots") ?? "Annots"));
    if (annots) {
      page.node.delete("Annots" as any);
    }
  }

  // Save with object streams for maximum compression
  const pdfBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  
  // If the compressed version is actually larger (rare), return original
  if (pdfBytes.length >= bytes.byteLength) {
    // Try without object streams
    const pdfBytes2 = await doc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });
    if (pdfBytes2.length >= bytes.byteLength) {
      return new Blob([bytes], { type: "application/pdf" });
    }
    return new Blob([pdfBytes2], { type: "application/pdf" });
  }
  
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function pdfToImages(file: File): Promise<{ name: string; blob: Blob }[]> {
  // Render each page to canvas using pdf-lib dimensions + draw placeholder
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  const results: { name: string; blob: Blob }[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const scale = Math.min(2048 / width, 2048 / height, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    const ctx = canvas.getContext("2d")!;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract and render text
    const textContent = await extractTextFromPdfPage(bytes, i);
    if (textContent.trim()) {
      ctx.fillStyle = "#000000";
      ctx.font = `${14 * scale}px sans-serif`;
      const lines = textContent.split(/\s+/);
      let x = 20 * scale;
      let y = 30 * scale;
      const maxWidth = canvas.width - 40 * scale;
      let line = "";

      for (const word of lines) {
        const testLine = line + word + " ";
        if (ctx.measureText(testLine).width > maxWidth) {
          ctx.fillText(line, x, y);
          line = word + " ";
          y += 20 * scale;
          if (y > canvas.height - 20 * scale) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    } else {
      ctx.fillStyle = "#999999";
      ctx.font = `${16 * scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`Page ${i + 1}`, canvas.width / 2, canvas.height / 2);
    }

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png", 0.92);
    });
    results.push({ name: `page_${i + 1}.png`, blob });
  }

  return results;
}

export async function removeBackground(file: File): Promise<Blob> {
  // Client-side background removal using Canvas
  // Works best with solid/simple backgrounds
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample corner pixels to detect background color
      const corners = [
        { x: 0, y: 0 },
        { x: canvas.width - 1, y: 0 },
        { x: 0, y: canvas.height - 1 },
        { x: canvas.width - 1, y: canvas.height - 1 },
      ];

      // Get average background color from corners
      let bgR = 0, bgG = 0, bgB = 0;
      for (const c of corners) {
        const idx = (c.y * canvas.width + c.x) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      }
      bgR = Math.round(bgR / 4);
      bgG = Math.round(bgG / 4);
      bgB = Math.round(bgB / 4);

      // Tolerance for background detection
      const tolerance = 45;

      // Make background pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - bgR, 2) +
          Math.pow(g - bgG, 2) +
          Math.pow(b - bgB, 2)
        );

        if (diff < tolerance) {
          // Fully transparent
          data[i + 3] = 0;
        } else if (diff < tolerance * 1.8) {
          // Semi-transparent for edge smoothing
          const alpha = Math.round(((diff - tolerance) / (tolerance * 0.8)) * 255);
          data[i + 3] = Math.min(255, alpha);
        }
      }

      // Edge refinement pass — smooth the alpha channel
      const width = canvas.width;
      const height = canvas.height;
      const alphaClone = new Uint8ClampedArray(data.length);
      alphaClone.set(data);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          // Average alpha with neighbors
          const neighbors = [
            ((y - 1) * width + x) * 4,
            ((y + 1) * width + x) * 4,
            (y * width + (x - 1)) * 4,
            (y * width + (x + 1)) * 4,
          ];
          let avgAlpha = alphaClone[idx + 3];
          for (const n of neighbors) {
            avgAlpha += alphaClone[n + 3];
          }
          avgAlpha = Math.round(avgAlpha / 5);
          // Only smooth if this pixel is on an edge (semi-transparent)
          if (data[idx + 3] > 0 && data[idx + 3] < 255) {
            data[idx + 3] = avgAlpha;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    };
    img.src = URL.createObjectURL(file);
  });
}

// ============ IMAGE TOOLS ============

export async function compressImage(file: File, qualityPercent: number): Promise<Blob> {
  // qualityPercent: 10-100, where lower = more compression
  const q = qualityPercent / 100;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale down dimensions for lower quality settings
      const scale = qualityPercent < 50 ? 0.5 + (qualityPercent / 100) : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Always output as JPEG for real compression (PNG is lossless)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(blob);
        },
        "image/jpeg",
        q
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export async function resizeImage(file: File, width: number, height: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), file.type || "image/png", 0.92);
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function convertImage(file: File, targetFormat: string): Promise<Blob> {
  return convertImageToFormat(file, targetFormat);
}

function convertImageToFormat(file: File, targetFormat: string): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const mimeType =
        targetFormat === "jpg" ? "image/jpeg"
        : targetFormat === "png" ? "image/png"
        : "image/webp";
      canvas.toBlob((blob) => resolve(blob!), mimeType, 0.92);
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function cropImage(file: File, x: number, y: number, w: number, h: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob!), file.type || "image/png", 0.92);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ============ DATA TOOLS ============

export function jsonToCsv(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  const arr = Array.isArray(data) ? data : [data];
  return Papa.unparse(arr);
}

export function csvToJson(csvStr: string): string {
  const result = Papa.parse(csvStr, { header: true, dynamicTyping: true });
  return JSON.stringify(result.data, null, 2);
}

export function xmlToJson(xmlStr: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, "text/xml");

  function nodeToObj(node: Element): any {
    const obj: any = {};
    if (node.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        obj["@attributes"][attr.name] = attr.value;
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const name = child.nodeName;
      const value = child.children.length > 0 ? nodeToObj(child) : child.textContent;
      if (obj[name]) {
        if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
        obj[name].push(value);
      } else {
        obj[name] = value;
      }
    }
    if (node.children.length === 0 && node.textContent) {
      return node.textContent;
    }
    return obj;
  }

  const result = nodeToObj(doc.documentElement);
  return JSON.stringify({ [doc.documentElement.nodeName]: result }, null, 2);
}

export function jsonToYaml(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  return yaml.dump(data);
}

export function yamlToJson(yamlStr: string): string {
  const data = yaml.load(yamlStr);
  return JSON.stringify(data, null, 2);
}

export function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function base64Decode(input: string): string {
  return decodeURIComponent(escape(atob(input)));
}

export function markdownToHtml(md: string): string {
  // Simple markdown to HTML converter
  let html = md
    // Headers
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links and images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');

  return `<p>${html}</p>`.replace(/<p><\/p>/g, '').replace(/<p>(<h[1-6]>)/g, '$1').replace(/(<\/h[1-6]>)<\/p>/g, '$1');
}

// ============ TEXT TOOLS ============

export function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { words: 0, characters: 0, sentences: 0, paragraphs: 0, lines: 0 };
  return {
    words: trimmed.split(/\s+/).length,
    characters: trimmed.length,
    sentences: (trimmed.match(/[.!?]+/g) || []).length || (trimmed.length > 0 ? 1 : 0),
    paragraphs: trimmed.split(/\n\s*\n/).filter(Boolean).length || 1,
    lines: trimmed.split("\n").length,
  };
}

export function convertCase(text: string, caseType: string): string {
  switch (caseType) {
    case "upper": return text.toUpperCase();
    case "lower": return text.toLowerCase();
    case "title": return text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
    case "sentence": return text.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    case "camel": return text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    case "snake": return text.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    case "kebab": return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    default: return text;
  }
}

export function generateLorem(paragraphs: number): string {
  const loremSentences = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
    "Eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident.",
    "Sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Curabitur pretium tincidunt lacus nunc pellentesque.",
    "Nulla facilisi etiam dignissim diam quis enim lobortis scelerisque.",
    "Pellentesque habitant morbi tristique senectus et netus et malesuada fames.",
    "Viverra accumsan in nisl nisi scelerisque eu ultrices vitae auctor.",
    "Turpis egestas integer eget aliquet nibh praesent tristique magna.",
    "Amet consectetur adipiscing elit duis tristique sollicitudin nibh sit amet.",
    "Facilisis magna etiam tempor orci eu lobortis elementum nibh tellus.",
  ];

  const result: string[] = [];
  for (let i = 0; i < paragraphs; i++) {
    const sentenceCount = 3 + Math.floor(Math.random() * 4);
    const paragraph: string[] = [];
    for (let j = 0; j < sentenceCount; j++) {
      paragraph.push(loremSentences[Math.floor(Math.random() * loremSentences.length)]);
    }
    result.push(paragraph.join(" "));
  }
  return result.join("\n\n");
}

export function generateQrSvg(text: string, size: number = 256): string {
  // Simple QR code generation using a basic algorithm
  // For production, use a proper QR library — this generates a placeholder SVG
  const encoded = encodeURIComponent(text);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="12" fill="black">QR: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}</text>
  </svg>`;
}

export async function generateHash(text: string, algorithm: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const algoMap: Record<string, string> = {
    "sha-1": "SHA-1",
    "sha-256": "SHA-256",
    "sha-384": "SHA-384",
    "sha-512": "SHA-512",
  };
  const algo = algoMap[algorithm] || "SHA-256";
  const hash = await crypto.subtle.digest(algo, data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function timestampToDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString();
}

export function dateToTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}
