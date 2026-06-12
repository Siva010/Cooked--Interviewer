import { NextResponse } from "next/server";
import { getEmbeddings, loadVectorStore } from "@/lib/rag";
import { AppSettings } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, settings }: { question: string; settings: AppSettings } = body;

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // 1. Initialize Embeddings and Load Vector Store
    const baseUrl = settings.custom_endpoint ? new URL(settings.custom_endpoint).origin : "http://localhost:11434";
    const embeddings = getEmbeddings(baseUrl);
    const store = await loadVectorStore(embeddings);

    // 2. Retrieve Top K Documents
    let context = "";
    let sources: string[] = [];
    if (store.memoryVectors && store.memoryVectors.length > 0) {
      const results = await store.similaritySearchWithScore(question, 3);
      // Only keep chunks that are highly similar to avoid false citations
      const relevantDocs = results.filter(([doc, score]) => score > 0.75);
      if (relevantDocs.length > 0) {
        context = relevantDocs.map(([doc, score]) => doc.pageContent).join("\n\n---\n\n");
        // Extract unique sources
        const allSources = relevantDocs.map(([doc]) => doc.metadata?.source).filter(Boolean);
        sources = Array.from(new Set(allSources));
      }
    }

    // 3. Generate Ideal Answer using Ollama
    const model = settings.custom_model || "llama3.1";
    
    const prompt = `You are an expert technical interviewer providing the absolute best reference answer to an interview question.

QUESTION: ${question}

${context ? `Here is some retrieved documentation. CRITICAL: First, evaluate if this documentation actually answers the specific question asked. If the documentation is completely irrelevant to the specific question (e.g., it mentions the keywords but discusses a different topic), IGNORE IT entirely and answer the question using your own general knowledge. If it is relevant, use it as your ground truth:

<context>
${context}
</context>
` : "Answer the question based on your own knowledge since no specific documentation context was found."}

Generate a short, compact, and highly accurate reference answer suitable for an interview context. Do not miss any main points, but avoid unnecessary fluff. Do not include introductory text like "Here is the answer". Just provide the definitive answer directly, using bullet points for clarity.
`;

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed: ${res.statusText}`);
    }

    const data = await res.json();
    let finalAnswer = data.response;

    if (sources.length > 0) {
      finalAnswer += `\n\n---\n**References:**\n${sources.map(s => `- [${s}](${s})`).join("\n")}`;
    }
    
    return NextResponse.json({ 
      answer: finalAnswer,
      isRag: sources.length > 0
    });

  } catch (error: any) {
    console.error("Ideal answer generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
