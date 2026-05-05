import { useParams, Link } from "wouter";
import { Header, Footer } from "../components/layout";
import { FileUpload } from "../components/file-upload";
import { getToolById, getCategoryById, getToolsByCategory } from "../lib/tools";
import { ToolCard } from "../components/tool-card";
import { Button } from "../components/ui/button";
import { SEO } from "../components/seo";
import { useState, useCallback, useEffect } from "react";
import { Download, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { saveAs } from "file-saver";
import { useAnalytics } from "../hooks/use-analytics";
import {
  mergePdfs, splitPdf, rotatePdf, watermarkPdf, imagesToPdf, protectPdf,
  pdfToWord, compressPdf, pdfToImages, removeBackground,
  compressImage, resizeImage, convertImage,
  jsonToCsv, csvToJson, xmlToJson, jsonToYaml, yamlToJson,
  base64Encode, base64Decode, markdownToHtml, markdownToPdf,
  countWords, convertCase, generateLorem,
  generateHash, hexToRgb, rgbToHex, rgbToHsl,
  timestampToDate, dateToTimestamp,
} from "../lib/processors";

type ProcessingState = "idle" | "processing" | "done" | "error";

export default function ToolPage() {
  const params = useParams<{ id: string }>();
  const tool = getToolById(params.id || "");
  const category = tool ? getCategoryById(tool.category) : undefined;
  const { trackEvent, trackView } = useAnalytics();

  useEffect(() => {
    if (tool) {
      trackView(`/tool/${tool.id}`, { tool: tool.name, category: tool.category });
      trackEvent("tool_viewed", { tool_id: tool.id, tool_name: tool.name, category: tool.category });
    }
  }, [tool?.id]);

  if (!tool || !category) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl text-foreground mb-4">Tool not found</h1>
          <Link href="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${tool.name} — Free Online Tool | NestDoc`}
        description={`${tool.description}. Free, fast and secure. No signup required. Process your files online with NestDoc.`}
      />
      <Header />
      <ToolContent tool={tool} category={category} />
      <RelatedTools tool={tool} />
      <Footer />
    </div>
  );
}

function ToolContent({ tool, category }: { tool: any; category: any }) {
  const isTextTool = ["word-counter", "case-converter", "lorem-generator", "qr-generator", "hash-generator", "color-converter", "timestamp-converter"].includes(tool.id);
  const isDataTool = ["json-to-csv", "csv-to-json", "xml-to-json", "json-to-yaml", "base64", "markdown-to-html"].includes(tool.id);

  if (isTextTool) return <TextToolUI tool={tool} category={category} />;
  if (isDataTool) return <DataToolUI tool={tool} category={category} />;
  return <FileToolUI tool={tool} category={category} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-xs text-[#1e3a5f] hover:underline flex items-center gap-1">
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

// ============ FILE-BASED TOOL UI ============
function FileToolUI({ tool, category }: { tool: any; category: any }) {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<Blob | null>(null);
  const [results, setResults] = useState<{ name: string; blob: Blob }[]>([]);
  const [error, setError] = useState("");
  const { trackEvent } = useAnalytics();
  const Icon = tool.icon;

  const [rotation, setRotation] = useState(90);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [splitPages, setSplitPages] = useState("1-3");
  const [targetFormat, setTargetFormat] = useState("png");
  const [resizeW, setResizeW] = useState(800);
  const [resizeH, setResizeH] = useState(600);
  const [quality, setQuality] = useState(60);
  const [pdfPassword, setPdfPassword] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");

  const isMultiple = tool.id === "merge-pdf" || tool.id === "image-to-pdf";

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => (isMultiple ? [...prev, ...newFiles] : newFiles));
    setResult(null); setResults([]); setState("idle"); setError("");
    trackEvent("file_uploaded", { tool_id: tool.id, file_count: newFiles.length, total_size: newFiles.reduce((s, f) => s + f.size, 0) });
    // Auto-detect page count for split-pdf
    if (tool.id === "split-pdf" && newFiles.length > 0) {
      newFiles[0].arrayBuffer().then(async (buf) => {
        try {
          const { PDFDocument } = await import("pdf-lib");
          const doc = await PDFDocument.load(buf);
          const total = doc.getPageCount();
          setSplitPages(`1-${total}`);
        } catch {}
      });
    }
  }, [isMultiple, tool.id]);

  const handleRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null); setResults([]); setState("idle");
  }, []);

  const process = async () => {
    if (files.length === 0) return;
    setState("processing"); setError("");
    trackEvent("processing_started", { tool_id: tool.id });

    try {
      switch (tool.id) {
        case "merge-pdf": { setResult(await mergePdfs(files)); break; }
        case "split-pdf": { setResults(await splitPdf(files[0], splitPages)); break; }
        case "rotate-pdf": { setResult(await rotatePdf(files[0], rotation)); break; }
        case "watermark-pdf": { setResult(await watermarkPdf(files[0], watermarkText)); break; }
        case "image-to-pdf": { setResult(await imagesToPdf(files)); break; }
        case "protect-pdf": { setResult(await protectPdf(files[0], pdfPassword)); break; }
        case "pdf-to-word": { setResult(await pdfToWord(files[0])); break; }
        case "compress-pdf": { setResult(await compressPdf(files[0])); break; }
        case "pdf-to-image": { setResults(await pdfToImages(files[0])); break; }
        case "remove-bg": { setResult(await removeBackground(files[0])); break; }
        case "compress-image": { setResult(await compressImage(files[0], quality)); break; }
        case "resize-image": { setResult(await resizeImage(files[0], resizeW, resizeH)); break; }
        case "convert-image": { setResult(await convertImage(files[0], targetFormat)); break; }
        case "markdown-to-pdf": {
          const text = await files[0].text();
          setResult(await markdownToPdf(text));
          break;
        }
        case "crop-image": {
          const img = new Image();
          const blob = await new Promise<Blob>((resolve) => {
            img.onload = () => {
              const w = Math.floor(img.width * 0.7);
              const h = Math.floor(img.height * 0.7);
              const x = Math.floor((img.width - w) / 2);
              const y = Math.floor((img.height - h) / 2);
              const canvas = document.createElement("canvas");
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
              canvas.toBlob((b) => resolve(b!), files[0].type, 0.92);
            };
            img.src = URL.createObjectURL(files[0]);
          });
          setResult(blob);
          break;
        }
        default: {
          const formData = new FormData();
          files.forEach((f) => formData.append("files", f));
          formData.append("toolId", tool.id);
          formData.append("options", JSON.stringify({ rotation, watermarkText, targetFormat, quality }));
          if (tool.id === "extract-text-from-audio" && elevenLabsKey.trim()) {
            formData.append("apiKey", elevenLabsKey.trim());
          }
          const res = await fetch("/api/process", { method: "POST", body: formData });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "Processing failed" }));
            throw new Error(errData.error || "Processing failed");
          }
          setResult(await res.blob());
        }
      }
      setState("done");
      trackEvent("processing_completed", { tool_id: tool.id });
    } catch (err: any) {
      setState("error");
      setError(err.message || "An error occurred during processing");
      trackEvent("processing_error", { tool_id: tool.id, error: err.message });
    }
  };

  const download = () => {
    if (!result) return;
    const extMap: Record<string, string> = {
      "merge-pdf": "pdf", "split-pdf": "pdf", "rotate-pdf": "pdf",
      "watermark-pdf": "pdf", "image-to-pdf": "pdf", "protect-pdf": "pdf",
      "compress-pdf": "pdf", "pdf-to-word": "docx", "pdf-to-image": "png",
      "remove-bg": "png", "compress-image": "jpg", "resize-image": "png", "crop-image": "png",
      "markdown-to-pdf": "pdf", "extract-text-from-audio": "txt",
    };
    let ext = tool.id === "convert-image" ? targetFormat : (extMap[tool.id] || "file");
    if (!ext && files.length > 0) {
      const origName = files[0].name;
      ext = origName.includes(".") ? origName.split(".").pop()! : "jpg";
    }
    // For tools that operate on a single source file, carry the original
    // basename through to the result. Falls back to the generic name if there
    // is no source file (e.g., generators) or the tool produces multiple files.
    const sourceName = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : "";
    const filename = sourceName
      ? `${sourceName}.${ext || "file"}`
      : `nestdoc_${tool.id}.${ext || "file"}`;
    saveAs(result, filename);
    trackEvent("file_downloaded", { tool_id: tool.id, file_size: result.size });
  };

  const downloadAll = () => {
    results.forEach((r) => saveAs(r.blob, r.name));
    trackEvent("file_downloaded", { tool_id: tool.id, file_count: results.length });
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Tools
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: category.bgColor }}>
          <Icon className="w-7 h-7" style={{ color: category.color }} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground mb-1">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      <FileUpload acceptedTypes={tool.acceptedTypes} multiple={isMultiple} onFilesSelected={handleFiles} files={files} onRemoveFile={handleRemove} />

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          {tool.id === "rotate-pdf" && (
            <OptionGroup label="Rotation Angle">
              <div className="flex gap-2">
                {[90, 180, 270].map((a) => (
                  <OptionButton key={a} active={rotation === a} onClick={() => setRotation(a)}>{a}°</OptionButton>
                ))}
              </div>
            </OptionGroup>
          )}

          {tool.id === "watermark-pdf" && (
            <OptionGroup label="Watermark Text">
              <TextInput value={watermarkText} onChange={setWatermarkText} placeholder="Enter watermark text..." />
            </OptionGroup>
          )}

          {tool.id === "split-pdf" && (
            <OptionGroup label="Page Ranges" hint="Separate ranges with commas">
              <TextInput value={splitPages} onChange={setSplitPages} placeholder="e.g. 1-3, 5, 7-9" />
            </OptionGroup>
          )}

          {tool.id === "protect-pdf" && (
            <OptionGroup label="Password">
              <TextInput value={pdfPassword} onChange={setPdfPassword} placeholder="Enter password..." type="password" />
            </OptionGroup>
          )}

          {tool.id === "extract-text-from-audio" && (
            <OptionGroup label="ElevenLabs API Key" hint="Get one at elevenlabs.io. Sent only with this request and never stored.">
              <TextInput value={elevenLabsKey} onChange={setElevenLabsKey} placeholder="sk_..." type="password" />
            </OptionGroup>
          )}

          {tool.id === "convert-image" && (
            <OptionGroup label="Target Format">
              <div className="flex gap-2">
                {["png", "jpg", "webp"].map((f) => (
                  <OptionButton key={f} active={targetFormat === f} onClick={() => setTargetFormat(f)} className="uppercase">{f}</OptionButton>
                ))}
              </div>
            </OptionGroup>
          )}

          {tool.id === "resize-image" && (
            <div className="flex gap-4">
              <OptionGroup label="Width (px)" className="flex-1">
                <NumberInput value={resizeW} onChange={setResizeW} />
              </OptionGroup>
              <OptionGroup label="Height (px)" className="flex-1">
                <NumberInput value={resizeH} onChange={setResizeH} />
              </OptionGroup>
            </div>
          )}

          {tool.id === "compress-image" && (
            <OptionGroup label={`Quality: ${quality}%`}>
              <input type="range" min={10} max={100} step={5} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-[#1e3a5f]" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Smaller file</span><span>Better quality</span>
              </div>
            </OptionGroup>
          )}

          <Button onClick={process} disabled={state === "processing"} className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white py-6 text-base font-semibold rounded-xl" size="lg">
            {state === "processing" ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</> : <><Icon className="w-5 h-5 mr-2" />{tool.name}</>}
          </Button>
        </div>
      )}

      {state === "done" && (result || results.length > 0) && (
        <div className="mt-6 bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div><p className="font-semibold text-emerald-300 font-sans">Done!</p><p className="text-sm text-emerald-400/70">Your file is ready to download</p></div>
          </div>
          {result && (
            <Button onClick={download} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-xl" size="lg">
              <Download className="w-5 h-5 mr-2" />Download File ({(result.size / 1024).toFixed(1)} KB)
            </Button>
          )}
          {results.length > 0 && (
            <Button onClick={downloadAll} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-xl" size="lg">
              <Download className="w-5 h-5 mr-2" />Download All ({results.length} files)
            </Button>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 bg-red-950/40 border border-red-800/50 rounded-xl p-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div><p className="font-semibold text-red-300 font-sans">Error</p><p className="text-sm text-red-400/70">{error}</p></div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============ DATA TOOL UI ============
function DataToolUI({ tool, category }: { tool: any; category: any }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const { trackEvent } = useAnalytics();
  const Icon = tool.icon;

  const processData = () => {
    setError("");
    try {
      switch (tool.id) {
        case "json-to-csv": setOutput(jsonToCsv(input)); break;
        case "csv-to-json": setOutput(csvToJson(input)); break;
        case "xml-to-json": setOutput(xmlToJson(input)); break;
        case "json-to-yaml": {
          try { JSON.parse(input); setOutput(jsonToYaml(input)); }
          catch { setOutput(yamlToJson(input)); }
          break;
        }
        case "base64": {
          setOutput(mode === "encode" ? base64Encode(input) : base64Decode(input));
          break;
        }
        case "markdown-to-html": setOutput(markdownToHtml(input)); break;
      }
      trackEvent("tool_used", { tool_id: tool.id, input_length: input.length });
    } catch (err: any) {
      setError(err.message || "Invalid input");
      trackEvent("processing_error", { tool_id: tool.id, error: err.message });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setInput(await file.text());
  };

  const downloadOutput = () => {
    const extMap: Record<string, string> = {
      "json-to-csv": "csv", "csv-to-json": "json", "xml-to-json": "json",
      "json-to-yaml": "yaml", "base64": "txt", "markdown-to-html": "html",
    };
    saveAs(new Blob([output], { type: "text/plain" }), `nestdoc_output.${extMap[tool.id] || "txt"}`);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Tools
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: category.bgColor }}>
          <Icon className="w-7 h-7" style={{ color: category.color }} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground mb-1">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      {tool.id === "base64" && (
        <div className="flex gap-2 mb-4">
          <OptionButton active={mode === "encode"} onClick={() => setMode("encode")}>Encode</OptionButton>
          <OptionButton active={mode === "decode"} onClick={() => setMode("decode")}>Decode</OptionButton>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium font-sans text-foreground">Input</label>
            <label className="text-xs text-[#1e3a5f] cursor-pointer hover:underline">
              <input type="file" accept={tool.acceptedTypes} onChange={handleFileUpload} className="hidden" />
              Upload file
            </label>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full h-80 px-4 py-3 rounded-xl border border-border bg-card text-sm font-mono text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none resize-none" placeholder={`Paste your ${tool.id.split("-")[0].toUpperCase()} here...`} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium font-sans text-foreground">Output</label>
            <div className="flex items-center gap-3">
              {output && <CopyButton text={output} />}
              {output && (
                <button onClick={downloadOutput} className="text-xs text-[#1e3a5f] hover:underline flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </button>
              )}
            </div>
          </div>
          {tool.id === "markdown-to-html" && output ? (
            <div className="w-full h-80 px-4 py-3 rounded-xl border border-border bg-secondary text-sm text-foreground overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: output }} className="prose prose-invert prose-sm max-w-none" />
            </div>
          ) : (
            <textarea value={output} readOnly className="w-full h-80 px-4 py-3 rounded-xl border border-border bg-secondary text-sm font-mono text-foreground outline-none resize-none" placeholder="Output will appear here..." />
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Button onClick={processData} disabled={!input.trim()} className="mt-4 w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white py-6 text-base font-semibold rounded-xl" size="lg">
        <Icon className="w-5 h-5 mr-2" />Convert
      </Button>
    </section>
  );
}

// ============ TEXT TOOL UI ============
function TextToolUI({ tool, category }: { tool: any; category: any }) {
  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState("upper");
  const [loremCount, setLoremCount] = useState(3);
  const [loremOutput, setLoremOutput] = useState("");
  const [hashAlgo, setHashAlgo] = useState("sha-256");
  const [hashOutput, setHashOutput] = useState("");
  const [hexColor, setHexColor] = useState("#1e3a5f");
  const [timestamp, setTimestamp] = useState(Math.floor(Date.now() / 1000).toString());
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 19));
  const { trackEvent } = useAnalytics();
  const Icon = tool.icon;

  const stats = tool.id === "word-counter" ? countWords(text) : null;
  const converted = tool.id === "case-converter" ? convertCase(text, caseType) : "";

  const rgbFromHex = hexToRgb(hexColor);
  const hslFromRgb = rgbFromHex ? rgbToHsl(rgbFromHex.r, rgbFromHex.g, rgbFromHex.b) : null;

  const computeHash = async () => {
    if (!text.trim()) return;
    const h = await generateHash(text, hashAlgo);
    setHashOutput(h);
  };

  useEffect(() => {
    if (tool.id === "hash-generator" && text.trim()) {
      computeHash();
    }
  }, [text, hashAlgo]);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Tools
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: category.bgColor }}>
          <Icon className="w-7 h-7" style={{ color: category.color }} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground mb-1">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      {/* Word Counter */}
      {tool.id === "word-counter" && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-56 px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none resize-none" placeholder="Start typing or paste your text here..." />
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
              {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="bg-card rounded-xl p-4 text-center border border-border">
                  <div className="text-2xl font-bold text-foreground font-sans">{val}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">{key}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Case Converter */}
      {tool.id === "case-converter" && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-40 px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none resize-none" placeholder="Type or paste text to convert..." />
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { value: "upper", label: "UPPER" }, { value: "lower", label: "lower" },
              { value: "title", label: "Title Case" }, { value: "sentence", label: "Sentence case" },
              { value: "camel", label: "camelCase" }, { value: "snake", label: "snake_case" },
              { value: "kebab", label: "kebab-case" },
            ].map((c) => (
              <OptionButton key={c.value} active={caseType === c.value} onClick={() => setCaseType(c.value)}>{c.label}</OptionButton>
            ))}
          </div>
          {text && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium font-sans text-foreground">Result</label>
                <CopyButton text={converted} />
              </div>
              <div className="w-full px-4 py-3 rounded-xl border border-border bg-secondary text-sm text-foreground min-h-[100px] whitespace-pre-wrap">{converted}</div>
            </div>
          )}
        </>
      )}

      {/* Lorem Generator */}
      {tool.id === "lorem-generator" && (
        <>
          <OptionGroup label="Number of Paragraphs">
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={20} value={loremCount} onChange={(e) => setLoremCount(Number(e.target.value))} className="flex-1 accent-[#1e3a5f]" />
              <span className="text-sm font-medium w-8 text-center text-foreground">{loremCount}</span>
            </div>
          </OptionGroup>
          <Button onClick={() => setLoremOutput(generateLorem(loremCount))} className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white py-5 rounded-xl mt-4" size="lg">
            Generate Lorem Ipsum
          </Button>
          {loremOutput && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium font-sans text-foreground">Generated Text</label>
                <CopyButton text={loremOutput} />
              </div>
              <div className="w-full px-4 py-3 rounded-xl border border-border bg-secondary text-sm text-foreground max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">{loremOutput}</div>
            </div>
          )}
        </>
      )}

      {/* QR Code Generator */}
      {tool.id === "qr-generator" && (
        <>
          <TextInput value={text} onChange={setText} placeholder="Enter text or URL to generate QR code..." />
          {text && (
            <div className="mt-6 flex flex-col items-center">
              <div className="bg-white p-6 rounded-2xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(text)}`}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}&format=png`}
                download="nestdoc_qr.png"
                className="mt-4"
              >
                <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-xl">
                  <Download className="w-4 h-4 mr-2" /> Download QR Code
                </Button>
              </a>
            </div>
          )}
        </>
      )}

      {/* Hash Generator */}
      {tool.id === "hash-generator" && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none resize-none" placeholder="Enter text to hash..." />
          <div className="flex flex-wrap gap-2 mt-4">
            {["sha-1", "sha-256", "sha-384", "sha-512"].map((a) => (
              <OptionButton key={a} active={hashAlgo === a} onClick={() => setHashAlgo(a)} className="uppercase">{a}</OptionButton>
            ))}
          </div>
          {hashOutput && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium font-sans text-foreground">Hash Output</label>
                <CopyButton text={hashOutput} />
              </div>
              <div className="w-full px-4 py-3 rounded-xl border border-border bg-secondary text-xs font-mono text-foreground break-all">{hashOutput}</div>
            </div>
          )}
        </>
      )}

      {/* Color Converter */}
      {tool.id === "color-converter" && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <input type="color" value={hexColor} onChange={(e) => setHexColor(e.target.value)} className="w-20 h-20 rounded-xl border-2 border-border cursor-pointer" />
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block font-sans text-foreground">HEX</label>
              <TextInput value={hexColor} onChange={setHexColor} placeholder="#000000" />
            </div>
          </div>

          {rgbFromHex && hslFromRgb && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-xs text-muted-foreground mb-1">HEX</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-foreground">{hexColor}</span>
                  <CopyButton text={hexColor} />
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-xs text-muted-foreground mb-1">RGB</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-foreground">rgb({rgbFromHex.r}, {rgbFromHex.g}, {rgbFromHex.b})</span>
                  <CopyButton text={`rgb(${rgbFromHex.r}, ${rgbFromHex.g}, ${rgbFromHex.b})`} />
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-xs text-muted-foreground mb-1">HSL</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-foreground">hsl({hslFromRgb.h}, {hslFromRgb.s}%, {hslFromRgb.l}%)</span>
                  <CopyButton text={`hsl(${hslFromRgb.h}, ${hslFromRgb.s}%, ${hslFromRgb.l}%)`} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 w-full h-24 rounded-xl border border-border" style={{ backgroundColor: hexColor }} />
        </>
      )}

      {/* Timestamp Converter */}
      {tool.id === "timestamp-converter" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium mb-2 block font-sans text-foreground">Current Unix Timestamp</label>
            <div className="text-3xl font-bold font-mono text-[#1e3a5f]">{Math.floor(Date.now() / 1000)}</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <label className="text-sm font-medium mb-2 block font-sans text-foreground">Unix Timestamp → Date</label>
              <TextInput value={timestamp} onChange={setTimestamp} placeholder="Enter Unix timestamp..." />
              {timestamp && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-foreground">{timestampToDate(Number(timestamp))}</span>
                  <CopyButton text={timestampToDate(Number(timestamp))} />
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <label className="text-sm font-medium mb-2 block font-sans text-foreground">Date → Unix Timestamp</label>
              <input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none" />
              {dateStr && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-foreground">{dateToTimestamp(dateStr)}</span>
                  <CopyButton text={String(dateToTimestamp(dateStr))} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============ RELATED TOOLS ============
function RelatedTools({ tool }: { tool: any }) {
  const category = getCategoryById(tool.category)!;
  const related = getToolsByCategory(tool.category).filter((t) => t.id !== tool.id).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className="bg-[#dce4ed] border-t border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl text-foreground mb-6">Related {category.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {related.map((t, i) => (<ToolCard key={t.id} tool={t} category={category} index={i} />))}
        </div>
      </div>
    </section>
  );
}

// ============ SHARED UI COMPONENTS ============
function OptionGroup({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium mb-2 block font-sans text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function OptionButton({ active, onClick, children, className = "" }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${active ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-card border-border hover:bg-secondary text-foreground"} ${className}`}>
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none" placeholder={placeholder} />
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]/50 outline-none" />
  );
}
