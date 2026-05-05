import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ELEVENLABS_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", tools: 26 });
});

// File processing endpoint (for server-side tools)
app.post("/api/process", async (c) => {
  try {
    const formData = await c.req.formData();
    const toolId = formData.get("toolId") as string;
    const files: File[] = formData.getAll("files") as File[];

    if (!toolId || files.length === 0) {
      return c.json({ error: "Missing tool ID or files" }, 400);
    }

    if (toolId === "extract-text-from-audio") {
      const userKey = (formData.get("apiKey") as string | null)?.trim() || undefined;
      return await extractTextFromAudio(c, files[0], userKey);
    }

    // Other server-side tools not yet implemented
    const serverTools = [
      "compress-pdf", "pdf-to-image", "pdf-to-word", "remove-bg",
      "word-to-pdf", "excel-to-pdf", "ppt-to-pdf",
      "compress-video", "convert-video", "extract-audio",
    ];

    if (serverTools.includes(toolId)) {
      return c.json({
        error: "Server-side processing is coming soon. This tool requires backend infrastructure that is being set up.",
      }, 501);
    }

    return c.json({ error: "Unknown tool" }, 400);
  } catch (err: any) {
    return c.json({ error: err.message || "Processing failed" }, 500);
  }
});

async function extractTextFromAudio(c: any, file: File, userKey?: string): Promise<Response> {
  // Prefer the user-supplied key, fall back to the env binding.
  const apiKey = userKey || c.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return c.json({
      error: "ElevenLabs API key required. Enter your key in the field above, or set ELEVENLABS_API_KEY via `wrangler secret put ELEVENLABS_API_KEY`.",
    }, 400);
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".mp3") && !name.endsWith(".m4a")) {
    return c.json({ error: "Unsupported audio format. Use MP3 or M4A." }, 400);
  }

  // ElevenLabs Speech-to-Text — multipart upload, returns JSON with `text`.
  const upstream = new FormData();
  upstream.append("file", file, file.name);
  upstream.append("model_id", "scribe_v1");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return c.json({ error: `Transcription failed (${res.status}): ${detail.slice(0, 300)}` }, 502);
  }

  const data = (await res.json()) as { text?: string };
  const text = (data.text ?? "").trim();
  if (!text) {
    return c.json({ error: "No speech detected in audio." }, 422);
  }

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="transcript.txt"`,
    },
  });
}

export default app;
