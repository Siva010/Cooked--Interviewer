import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { ingestDocument, loadVectorStore, saveVectorStore, getEmbeddings } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, crawl4ai_endpoint, gemini_api_key, domain, generate_qa, llm_provider, custom_endpoint, custom_model } = body;

    if (!url || !crawl4ai_endpoint) {
      return NextResponse.json(
        { error: "Missing url or crawl4ai_endpoint" },
        { status: 400 }
      );
    }

    // 1. Call Crawl4AI local docker
    let crawlData;
    try {
      const crawlRes = await fetch(crawl4ai_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });

      if (!crawlRes.ok) {
        throw new Error(`Crawl4AI failed: ${crawlRes.statusText}`);
      }

      crawlData = await crawlRes.json();
    } catch (e: any) {
      throw new Error(`Failed to contact Crawl4AI: ${e.message}. Ensure your Docker container is running.`);
    }

    // Extract markdown from common Crawl4AI response formats
    let markdownObj: any = crawlData;
    if (Array.isArray(crawlData) && crawlData.length > 0) {
        markdownObj = crawlData[0];
    } else if (crawlData.results && crawlData.results[0]) {
        markdownObj = crawlData.results[0];
    }

    let markdown = "";
    if (markdownObj && typeof markdownObj.markdown === "string") {
        markdown = markdownObj.markdown;
    } else if (markdownObj && markdownObj.markdown && typeof markdownObj.markdown === "object") {
        // sometimes markdown is an object like { fit_markdown: "...", raw_markdown: "..." }
        markdown = markdownObj.markdown.fit_markdown || markdownObj.markdown.raw_markdown || JSON.stringify(markdownObj.markdown);
    } else if (markdownObj && typeof markdownObj.html === "string") {
        markdown = markdownObj.html;
    } else {
        markdown = JSON.stringify(crawlData);
    }

    if (!markdown || markdown.trim() === "") {
        throw new Error("Crawl4AI returned empty markdown content.");
    }

    if (!generate_qa) {
      return NextResponse.json({ success: true, data: null, markdown });
    }

    if (llm_provider === "gemini" && !gemini_api_key) {
        throw new Error("Gemini API Key is required to generate Q&A banks.");
    }

    if (llm_provider !== "gemini" && (!custom_endpoint || !custom_model)) {
        throw new Error("Local LLM Endpoint and Model are required.");
    }

    const prompt = `
You are an expert technical interviewer and curriculum designer.
I will provide you with a markdown document scraped from a website.
I want you to generate a set of at least 5 highly technical interview questions based on this content.

DOMAIN: ${domain || "Backend"}

Please output the result as a valid JSON array matching this exact schema:
[
  {
    "id": "<generate a unique string ID>",
    "domain": "${domain || "Backend"}",
    "subdomain": "<derive from content>",
    "question": "<the question>",
    "ideal_answer": "<the answer extracted from the text>",
    "keywords": ["<keyword1>", "<keyword2>"],
    "common_mistakes": ["<mistake1>", "<mistake2>"],
    "followups": ["<followup1>", "<followup2>"],
    "roasts": {
      "angry_staff": "<a roast for a bad answer from an angry staff engineer>",
      "strict_prof": "<a roast from a strict professor>",
      "faang_bar": "<a roast from a FAANG bar raiser>",
      "startup_cto": "<a roast from a startup CTO>"
    }
  }
]

MARKDOWN CONTENT:
${markdown.slice(0, 15000)}
    `;

    let qaBank = null;

    if (llm_provider === "gemini") {
      const genAI = new GoogleGenerativeAI(gemini_api_key);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: "You only output raw valid JSON. Do not use markdown code blocks like ```json.",
      });

      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
          throw new Error("Failed to parse JSON from Gemini response.");
      }
      qaBank = JSON.parse(jsonMatch[0]);
    } else {
      const endpoint = custom_endpoint.replace(/\/+$/, "");
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: custom_model,
          messages: [
            { role: "system", content: "You only output raw valid JSON. Do not use markdown code blocks. You return an array of objects." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        })
      });

      if (!res.ok) {
        throw new Error(`Local LLM failed: ${res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content from Local LLM.");

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
          throw new Error("Failed to parse JSON from Local LLM response.");
      }
      qaBank = JSON.parse(jsonMatch[0]);
    }

    // 3. Ingest into Vector DB
    try {
      const embeddings = getEmbeddings();
      const store = await loadVectorStore(embeddings);
      await ingestDocument(store, markdown, { source: url, domain: domain || "Backend" });
      await saveVectorStore(store);
    } catch (e: any) {
      console.error("Failed to ingest into VectorDB:", e.message);
      // We don't fail the whole request, just log it.
    }

    // 4. Append to Question Bank
    try {
      const domainMap: Record<string, string> = {
        "Operating Systems": "os",
        "DBMS": "dbms",
        "Computer Networks": "cn",
        "OOP": "oop",
        "DSA": "dsa",
        "Frontend": "frontend",
        "Backend": "backend",
      };
      const folder = domainMap[domain] || "backend";
      const filePath = path.join(process.cwd(), "public", "data", folder, "all.json");
      
      let existing = [];
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
      const updated = existing.concat(qaBank);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    } catch (e: any) {
      console.error("Failed to append to question bank:", e.message);
    }

    return NextResponse.json({ success: true, data: qaBank, markdown });

  } catch (error: any) {
    console.error("Crawl route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
