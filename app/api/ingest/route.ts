import { NextResponse } from "next/server";
import { getEmbeddings, loadVectorStore, saveVectorStore, ingestDocument } from "@/lib/rag";
import { AppSettings } from "@/types";
import fs from "fs";
import path from "path";

const HISTORY_PATH = path.join(process.cwd(), "public", "data", "ingested_links.json");

function addLinkToHistory(url: string, chunks: number) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
      history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
    }
    history.push({ url, chunks, timestamp: new Date().toISOString() });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error("Failed to save ingest history", e);
  }
}

function getIngestHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read ingest history", e);
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, settings }: { url: string; settings: AppSettings } = body;

    if (!url || !settings?.crawl4ai_endpoint) {
      return NextResponse.json({ error: "Missing url or crawl4ai_endpoint in settings" }, { status: 400 });
    }

    let markdown = "";
    if (settings.crawl4ai_endpoint === "jina") {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`);
      if (!jinaRes.ok) throw new Error("Jina fetch failed");
      markdown = await jinaRes.text();
    } else {
      const crawlRes = await fetch(settings.crawl4ai_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });

      if (!crawlRes.ok) {
        throw new Error(`Crawl4AI failed: ${crawlRes.statusText}`);
      }

      const crawlData = await crawlRes.json();
      let markdownObj: any = crawlData;
      if (Array.isArray(crawlData) && crawlData.length > 0) markdownObj = crawlData[0];
      else if (crawlData.results && crawlData.results[0]) markdownObj = crawlData.results[0];

      if (markdownObj && typeof markdownObj.markdown === "string") markdown = markdownObj.markdown;
      else if (markdownObj && markdownObj.markdown && typeof markdownObj.markdown === "object") {
        markdown = markdownObj.markdown.fit_markdown || markdownObj.markdown.raw_markdown;
      } else if (markdownObj && typeof markdownObj.html === "string") markdown = markdownObj.html;
    }

    if (!markdown || markdown.trim() === "") {
      throw new Error("Crawl4AI returned empty content.");
    }

    // 2. Initialize Embeddings and Vector Store
    // We assume Ollama is running locally for embeddings based on settings or defaults
    const baseUrl = settings.custom_endpoint ? new URL(settings.custom_endpoint).origin : "http://localhost:11434";
    const embeddings = getEmbeddings(baseUrl);
    const store = await loadVectorStore(embeddings);

    // 3. Chunk and Ingest
    await ingestDocument(store, markdown, { source: url, ingestedAt: new Date().toISOString() });

    // 4. Save Vector Store to disk
    await saveVectorStore(store);

    // 5. Track history
    addLinkToHistory(url, Math.round(markdown.length / 1000));

    return NextResponse.json({
      success: true,
      message: `Successfully ingested and vectorized content from ${url}`,
      totalChunksInStore: store.memoryVectors.length,
    });
  } catch (error: any) {
    console.error("Ingestion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const embeddings = getEmbeddings();
    const store = await loadVectorStore(embeddings);
    const history = getIngestHistory();
    return NextResponse.json({
      totalChunks: store.memoryVectors.length,
      history,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
