import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", tools: 24 });
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

    // For now, return a meaningful error for server-side tools
    // These would be implemented with actual processing libraries on the server
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

export default app;
