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

// ============ MARKDOWN TOOLS ============

// Convert Markdown to PDF with GitHub-flavored styling.
// Layouts text using pdf-lib's standard fonts in a single pass — supports
// headings, paragraphs, bold/italic/inline-code, fenced code blocks, lists
// (ordered + unordered + task lists), blockquotes, horizontal rules, links,
// and pipe tables. Images and HTML passthrough are skipped.
export async function markdownToPdf(md: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const helvBoldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);

  // GitHub palette
  const colorText = rgb(0.094, 0.106, 0.122);     // #181a1f-ish (#1f2328)
  const colorMuted = rgb(0.396, 0.439, 0.486);    // #656d76
  const colorLink = rgb(0.035, 0.365, 0.847);     // #0969da
  const colorBorder = rgb(0.851, 0.871, 0.894);   // #d8dee4 (#d0d7de)
  const colorCodeBg = rgb(0.961, 0.969, 0.976);   // #f6f8fa
  const colorQuoteBar = rgb(0.851, 0.871, 0.894); // #d0d7de
  const colorRule = rgb(0.851, 0.871, 0.894);

  // Page geometry — Letter
  const pageW = 612;
  const pageH = 792;
  const marginX = 56;
  const marginY = 64;
  const contentW = pageW - marginX * 2;
  const baseFontSize = 11;
  const lineHeight = 1.5;

  let page = doc.addPage([pageW, pageH]);
  let cursorY = pageH - marginY;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < marginY) {
      page = doc.addPage([pageW, pageH]);
      cursorY = pageH - marginY;
    }
  };

  // Sanitise Markdown — convert tabs, normalise line endings, and strip any
  // glyphs that pdf-lib's StandardFonts (WinAnsi) can't encode. We must do
  // this BEFORE any width measurement or wrap call, because
  // `font.widthOfTextAtSize` itself throws on unencodable codepoints — so
  // sanitising only at draw time is too late.
  const source = sanitiseForStdFont(
    md.replace(/\r\n/g, "\n").replace(/\t/g, "    ")
  );

  type InlineSeg = { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string };

  const parseInline = (text: string): InlineSeg[] => {
    const segs: InlineSeg[] = [];
    let i = 0;
    let buf = "";
    const flush = () => { if (buf) { segs.push({ text: buf }); buf = ""; } };

    while (i < text.length) {
      const ch = text[i];
      const rest = text.slice(i);

      // Inline code: `code` (no nesting)
      if (ch === "`") {
        const end = text.indexOf("`", i + 1);
        if (end !== -1) {
          flush();
          segs.push({ text: text.slice(i + 1, end), code: true });
          i = end + 1;
          continue;
        }
      }

      // Image — skip, render alt as plain text
      if (ch === "!" && text[i + 1] === "[") {
        const close = text.indexOf("]", i + 2);
        if (close !== -1 && text[close + 1] === "(") {
          const parenEnd = text.indexOf(")", close + 2);
          if (parenEnd !== -1) {
            flush();
            const alt = text.slice(i + 2, close);
            segs.push({ text: alt ? `[${alt}]` : "[image]", italic: true });
            i = parenEnd + 1;
            continue;
          }
        }
      }

      // Link [text](url)
      if (ch === "[") {
        const close = text.indexOf("]", i + 1);
        if (close !== -1 && text[close + 1] === "(") {
          const parenEnd = text.indexOf(")", close + 2);
          if (parenEnd !== -1) {
            flush();
            const linkText = text.slice(i + 1, close);
            const url = text.slice(close + 2, parenEnd);
            const inner = parseInline(linkText);
            inner.forEach((s) => segs.push({ ...s, link: url }));
            i = parenEnd + 1;
            continue;
          }
        }
      }

      // Bold+italic ***text***
      if (rest.startsWith("***")) {
        const end = text.indexOf("***", i + 3);
        if (end !== -1) {
          flush();
          segs.push({ text: text.slice(i + 3, end), bold: true, italic: true });
          i = end + 3;
          continue;
        }
      }

      // Bold **text** or __text__
      if (rest.startsWith("**") || rest.startsWith("__")) {
        const marker = rest.slice(0, 2);
        const end = text.indexOf(marker, i + 2);
        if (end !== -1) {
          flush();
          segs.push({ text: text.slice(i + 2, end), bold: true });
          i = end + 2;
          continue;
        }
      }

      // Italic *text* or _text_
      if ((ch === "*" || ch === "_") && text[i + 1] !== ch) {
        const end = text.indexOf(ch, i + 1);
        if (end !== -1 && end > i + 1) {
          flush();
          segs.push({ text: text.slice(i + 1, end), italic: true });
          i = end + 1;
          continue;
        }
      }

      // Strikethrough ~~text~~ — render as plain (pdf-lib has no strikethrough); fall through
      if (rest.startsWith("~~")) {
        const end = text.indexOf("~~", i + 2);
        if (end !== -1) {
          flush();
          segs.push({ text: text.slice(i + 2, end), italic: true });
          i = end + 2;
          continue;
        }
      }

      // Autolink <http://...>
      if (ch === "<") {
        const end = text.indexOf(">", i + 1);
        if (end !== -1) {
          const inner = text.slice(i + 1, end);
          if (/^https?:\/\//i.test(inner)) {
            flush();
            segs.push({ text: inner, link: inner });
            i = end + 1;
            continue;
          }
        }
      }

      buf += ch;
      i++;
    }
    flush();
    return segs;
  };

  const fontFor = (s: InlineSeg) => {
    if (s.code) return s.bold ? monoBold : mono;
    if (s.bold && s.italic) return helvBoldItalic;
    if (s.bold) return helvBold;
    if (s.italic) return helvItalic;
    return helv;
  };

  // Wrap segments to lines fitting maxWidth — yields { width, segs } per line
  const wrapSegments = (segs: InlineSeg[], maxWidth: number, fontSize: number) => {
    const lines: { width: number; parts: { seg: InlineSeg; text: string; width: number }[] }[] = [];
    let current: { seg: InlineSeg; text: string; width: number }[] = [];
    let currentW = 0;
    const spaceWidth = (s: InlineSeg) => fontFor(s).widthOfTextAtSize(" ", fontSize);

    for (const seg of segs) {
      // Split by whitespace but preserve explicit newlines from hard breaks
      const tokens = seg.text.split(/(\s+)/);
      for (const tok of tokens) {
        if (tok === "") continue;
        const isSpace = /^\s+$/.test(tok);
        const w = fontFor(seg).widthOfTextAtSize(tok, fontSize);
        if (isSpace) {
          if (current.length > 0 && currentW + w <= maxWidth) {
            current.push({ seg, text: " ", width: spaceWidth(seg) });
            currentW += spaceWidth(seg);
          }
          continue;
        }
        if (currentW + w > maxWidth && current.length > 0) {
          // Trim trailing space
          while (current.length && /^\s+$/.test(current[current.length - 1].text)) {
            currentW -= current[current.length - 1].width;
            current.pop();
          }
          lines.push({ width: currentW, parts: current });
          current = [];
          currentW = 0;
        }
        // Long-word break
        if (w > maxWidth) {
          let chunk = "";
          let chunkW = 0;
          for (const ch of tok) {
            const cw = fontFor(seg).widthOfTextAtSize(ch, fontSize);
            if (chunkW + cw > maxWidth && chunk) {
              current.push({ seg, text: chunk, width: chunkW });
              currentW += chunkW;
              lines.push({ width: currentW, parts: current });
              current = [];
              currentW = 0;
              chunk = ch;
              chunkW = cw;
            } else {
              chunk += ch;
              chunkW += cw;
            }
          }
          if (chunk) {
            current.push({ seg, text: chunk, width: chunkW });
            currentW += chunkW;
          }
        } else {
          current.push({ seg, text: tok, width: w });
          currentW += w;
        }
      }
    }
    if (current.length) {
      while (current.length && /^\s+$/.test(current[current.length - 1].text)) {
        currentW -= current[current.length - 1].width;
        current.pop();
      }
      if (current.length) lines.push({ width: currentW, parts: current });
    }
    return lines;
  };

  const drawLine = (
    parts: { seg: InlineSeg; text: string; width: number }[],
    x: number,
    y: number,
    fontSize: number,
    defaultColor = colorText
  ) => {
    let dx = x;
    for (const p of parts) {
      const f = fontFor(p.seg);
      const c = p.seg.link ? colorLink : defaultColor;
      // Draw inline code background
      if (p.seg.code && p.text.trim()) {
        page.drawRectangle({
          x: dx - 1,
          y: y - 2,
          width: p.width + 2,
          height: fontSize + 2,
          color: colorCodeBg,
        });
      }
      // Sanitise glyphs that StandardFonts can't render (smart quotes, em-dash etc.)
      const safe = sanitiseForStdFont(p.text);
      page.drawText(safe, { x: dx, y, size: fontSize, font: f, color: c });
      // Underline links
      if (p.seg.link && p.text.trim()) {
        page.drawLine({
          start: { x: dx, y: y - 1 },
          end: { x: dx + p.width, y: y - 1 },
          color: colorLink,
          thickness: 0.5,
        });
      }
      dx += p.width;
    }
  };

  const drawInlineBlock = (
    segs: InlineSeg[],
    x: number,
    maxWidth: number,
    fontSize: number,
    color = colorText,
    afterSpacing = 6
  ) => {
    const lh = fontSize * lineHeight;
    const lines = wrapSegments(segs, maxWidth, fontSize);
    for (const line of lines) {
      ensureSpace(lh);
      cursorY -= fontSize;
      drawLine(line.parts, x, cursorY, fontSize, color);
      cursorY -= lh - fontSize;
    }
    cursorY -= afterSpacing;
  };

  // Block-level parse — line-by-line state machine
  const lines = source.split("\n");
  let lineIdx = 0;

  while (lineIdx < lines.length) {
    let line = lines[lineIdx];

    // Fenced code block ``` or ~~~
    const fence = line.match(/^(\s*)(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
    if (fence) {
      const fenceMark = fence[2];
      const codeLines: string[] = [];
      lineIdx++;
      while (lineIdx < lines.length) {
        const close = lines[lineIdx].match(/^(\s*)([`~]{3,})\s*$/);
        if (close && close[2][0] === fenceMark[0] && close[2].length >= fenceMark.length) {
          lineIdx++;
          break;
        }
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      const fontSize = 9.5;
      const lh = fontSize * 1.45;
      const padX = 10;
      const padY = 8;
      const blockH = codeLines.length * lh + padY * 2;
      ensureSpace(blockH + 6);
      const blockTop = cursorY;
      page.drawRectangle({
        x: marginX,
        y: cursorY - blockH,
        width: contentW,
        height: blockH,
        color: colorCodeBg,
        borderColor: colorBorder,
        borderWidth: 0.5,
      });
      let ty = blockTop - padY - fontSize;
      for (const cl of codeLines) {
        // Hard wrap at content width
        const text = sanitiseForStdFont(cl);
        const maxChars = Math.floor((contentW - padX * 2) / mono.widthOfTextAtSize("M", fontSize));
        if (text.length <= maxChars) {
          page.drawText(text, { x: marginX + padX, y: ty, size: fontSize, font: mono, color: colorText });
        } else {
          for (let s = 0; s < text.length; s += maxChars) {
            if (s > 0) {
              ensureSpace(lh);
              ty -= lh;
            }
            page.drawText(text.slice(s, s + maxChars), { x: marginX + padX, y: ty, size: fontSize, font: mono, color: colorText });
          }
        }
        ty -= lh;
      }
      cursorY = blockTop - blockH - 8;
      continue;
    }

    // Horizontal rule (3+ matching - * or _ chars, optionally separated by spaces)
    if (/^\s*(?:-\s*){3,}$|^\s*(?:\*\s*){3,}$|^\s*(?:_\s*){3,}$/.test(line)) {
      ensureSpace(14);
      cursorY -= 6;
      page.drawLine({
        start: { x: marginX, y: cursorY },
        end: { x: marginX + contentW, y: cursorY },
        color: colorRule,
        thickness: 0.5,
      });
      cursorY -= 10;
      lineIdx++;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const sizeMap = [22, 18, 15, 13, 12, 11];
      const fontSize = sizeMap[level - 1];
      const segs = parseInline(heading[2]);
      const topPad = level <= 2 ? 12 : 8;
      const bottomPad = level <= 2 ? 6 : 4;
      cursorY -= topPad;
      const lh = fontSize * 1.25;
      const wrapped = wrapSegments(segs, contentW, fontSize);
      for (const wl of wrapped) {
        ensureSpace(lh);
        cursorY -= fontSize;
        // Render with bold variant of each seg
        const boldedParts = wl.parts.map((p) => ({
          seg: { ...p.seg, bold: true },
          text: p.text,
          width: (p.seg.code ? (p.seg.bold ? monoBold : mono) : helvBold).widthOfTextAtSize(p.text, fontSize),
        }));
        drawLine(boldedParts, marginX, cursorY, fontSize, colorText);
        cursorY -= lh - fontSize;
      }
      // Underline for h1/h2 (GitHub style)
      if (level <= 2) {
        cursorY -= 2;
        page.drawLine({
          start: { x: marginX, y: cursorY },
          end: { x: marginX + contentW, y: cursorY },
          color: colorBorder,
          thickness: 0.5,
        });
      }
      cursorY -= bottomPad;
      lineIdx++;
      continue;
    }

    // Blockquote — collect contiguous > lines
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && /^\s*>/.test(lines[lineIdx])) {
        quoteLines.push(lines[lineIdx].replace(/^\s*>\s?/, ""));
        lineIdx++;
      }
      const quoteText = quoteLines.join(" ").trim();
      const segs = parseInline(quoteText);
      const fontSize = baseFontSize;
      const lh = fontSize * lineHeight;
      const indent = 16;
      const wrapped = wrapSegments(segs, contentW - indent - 8, fontSize);
      const blockH = wrapped.length * lh + 6;
      ensureSpace(blockH);
      const top = cursorY;
      page.drawRectangle({
        x: marginX,
        y: cursorY - blockH,
        width: 3,
        height: blockH,
        color: colorQuoteBar,
      });
      let ty = top;
      for (const wl of wrapped) {
        ty -= fontSize;
        drawLine(wl.parts, marginX + indent, ty, fontSize, colorMuted);
        ty -= lh - fontSize;
      }
      cursorY = top - blockH - 4;
      continue;
    }

    // Pipe table — header | --- | rows
    if (/^\s*\|.+\|\s*$/.test(line) && lineIdx + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[lineIdx + 1])) {
      const splitRow = (l: string) =>
        l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const header = splitRow(line);
      lineIdx += 2; // skip header + separator
      const rows: string[][] = [];
      while (lineIdx < lines.length && /^\s*\|.+\|\s*$/.test(lines[lineIdx])) {
        rows.push(splitRow(lines[lineIdx]));
        lineIdx++;
      }
      const cols = header.length;
      const colW = contentW / cols;
      const fontSize = baseFontSize;
      const padX = 6;
      const padY = 5;

      const renderRow = (cells: string[], bold: boolean) => {
        const cellLines = cells.map((c) =>
          wrapSegments(parseInline(c), colW - padX * 2, fontSize)
        );
        const maxLines = Math.max(1, ...cellLines.map((cl) => cl.length));
        const rowH = maxLines * fontSize * lineHeight + padY * 2;
        ensureSpace(rowH);
        const top = cursorY;
        // Cell borders
        for (let i = 0; i <= cols; i++) {
          const x = marginX + i * colW;
          page.drawLine({
            start: { x, y: top },
            end: { x, y: top - rowH },
            color: colorBorder,
            thickness: 0.5,
          });
        }
        page.drawLine({ start: { x: marginX, y: top }, end: { x: marginX + contentW, y: top }, color: colorBorder, thickness: 0.5 });
        page.drawLine({ start: { x: marginX, y: top - rowH }, end: { x: marginX + contentW, y: top - rowH }, color: colorBorder, thickness: 0.5 });

        if (bold) {
          page.drawRectangle({
            x: marginX + 0.5,
            y: top - rowH + 0.5,
            width: contentW - 1,
            height: rowH - 1,
            color: colorCodeBg,
          });
        }

        for (let ci = 0; ci < cols; ci++) {
          let ty = top - padY;
          const lns = cellLines[ci];
          for (const wl of lns) {
            ty -= fontSize;
            const parts = bold
              ? wl.parts.map((p) => ({
                  seg: { ...p.seg, bold: true },
                  text: p.text,
                  width: (p.seg.code ? monoBold : helvBold).widthOfTextAtSize(p.text, fontSize),
                }))
              : wl.parts;
            drawLine(parts, marginX + ci * colW + padX, ty, fontSize, colorText);
            ty -= fontSize * lineHeight - fontSize;
          }
        }
        cursorY = top - rowH;
      };

      renderRow(header, true);
      for (const r of rows) {
        // Pad short rows
        while (r.length < cols) r.push("");
        renderRow(r.slice(0, cols), false);
      }
      cursorY -= 8;
      continue;
    }

    // Lists — collect contiguous list items (supports nested via leading spaces)
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      type Item = { indent: number; ordered: boolean; marker: string; text: string; checked?: boolean };
      const items: Item[] = [];
      while (lineIdx < lines.length) {
        const cur = lines[lineIdx];
        const u = cur.match(/^(\s*)([-*+])\s+(.*)$/);
        const o = cur.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (!u && !o) {
          // Continuation line for previous item (indented)
          if (items.length > 0 && /^\s+\S/.test(cur) && cur.trim() !== "") {
            items[items.length - 1].text += " " + cur.trim();
            lineIdx++;
            continue;
          }
          break;
        }
        const m = (u || o)!;
        const indent = Math.floor(m[1].length / 2);
        const ordered = !!o;
        let text = m[3];
        let checked: boolean | undefined;
        const taskMatch = text.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          checked = taskMatch[1].toLowerCase() === "x";
          text = taskMatch[2];
        }
        items.push({ indent, ordered, marker: m[2], text, checked });
        lineIdx++;
      }
      const fontSize = baseFontSize;
      const lh = fontSize * lineHeight;
      const counters: Record<number, number> = {};
      for (const it of items) {
        counters[it.indent] = (counters[it.indent] || 0) + 1;
        // Reset deeper counters when item appears
        for (const k of Object.keys(counters).map(Number)) if (k > it.indent) delete counters[k];
        const indentPx = 14 + it.indent * 18;
        const bullet = it.checked !== undefined
          ? (it.checked ? "[x]" : "[ ]")
          : it.ordered
            ? `${counters[it.indent]}.`
            : "•";
        const segs = parseInline(it.text);
        const wrapped = wrapSegments(segs, contentW - indentPx - 12, fontSize);
        for (let li = 0; li < wrapped.length; li++) {
          ensureSpace(lh);
          cursorY -= fontSize;
          if (li === 0) {
            page.drawText(sanitiseForStdFont(bullet), {
              x: marginX + indentPx - 12,
              y: cursorY,
              size: fontSize,
              font: it.checked !== undefined ? mono : helv,
              color: colorText,
            });
          }
          drawLine(wrapped[li].parts, marginX + indentPx, cursorY, fontSize);
          cursorY -= lh - fontSize;
        }
      }
      cursorY -= 6;
      continue;
    }

    // Blank line — paragraph break already handled below
    if (line.trim() === "") {
      lineIdx++;
      continue;
    }

    // Paragraph — gather contiguous non-blank, non-block lines
    const para: string[] = [line];
    lineIdx++;
    while (lineIdx < lines.length) {
      const next = lines[lineIdx];
      if (
        next.trim() === "" ||
        /^#{1,6}\s+/.test(next) ||
        /^\s*>/.test(next) ||
        /^(\s*)([-*+])\s+/.test(next) ||
        /^(\s*)\d+\.\s+/.test(next) ||
        /^\s*([-*_])\s*\1\s*\1/.test(next) ||
        /^(\s*)(`{3,}|~{3,})/.test(next) ||
        (/^\s*\|.+\|\s*$/.test(next) && lineIdx + 1 < lines.length && /^\s*\|?\s*:?-+:?/.test(lines[lineIdx + 1]))
      ) break;
      para.push(next);
      lineIdx++;
    }
    // GFM hard line break: line ending with two spaces
    const paraText = para
      .map((l, i) => (l.endsWith("  ") && i < para.length - 1 ? l.trimEnd() + "\n" : l))
      .join(" ")
      .replace(/\s*\n\s*/g, "\n");

    // Split on hard breaks, render each as its own inline block
    const chunks = paraText.split("\n");
    for (let ci = 0; ci < chunks.length; ci++) {
      const segs = parseInline(chunks[ci]);
      drawInlineBlock(segs, marginX, contentW, baseFontSize, colorText, ci === chunks.length - 1 ? 8 : 2);
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

// pdf-lib's StandardFonts (WinAnsi) can't encode glyphs outside its ~256-char
// set — replace common Unicode punctuation with ASCII equivalents so we don't
// throw on smart quotes, em-dashes, ellipses etc. Anything still unencodable
// is replaced with '?'.
function sanitiseForStdFont(text: string): string {
  return text
    // Smart quotes
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    // Dashes (en, em, minus)
    .replace(/[–—−]/g, "-")
    // Ellipsis
    .replace(/…/g, "...")
    // Bullets and middle-dots
    .replace(/[•·‧]/g, "*")
    // Arrows -> ASCII
    .replace(/[→➜➤]/g, "->")
    .replace(/←/g, "<-")
    .replace(/↔/g, "<->")
    .replace(/⇒/g, "=>")
    .replace(/⇐/g, "<=")
    // NBSP and assorted spaces -> regular space
    .replace(/[  -   　]/g, " ")
    // Zero-width marks and bidi controls -> drop
    .replace(/[​-‏‪-‮⁠﻿]/g, "")
    // Anything else outside Latin-1 -> '?'
    .replace(/[^\x00-\xFF]/g, "?");
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
