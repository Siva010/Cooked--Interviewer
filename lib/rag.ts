import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import fs from "fs";
import path from "path";

const VECTOR_STORE_PATH = path.join(process.cwd(), "public", "data", "vectordb.json");

export function getEmbeddings(baseUrl = "http://localhost:11434") {
  return new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl,
  });
}

export class SimpleVectorStore {
  memoryVectors: { content: string; embedding: number[]; metadata: any }[] = [];

  constructor(public embeddings: OllamaEmbeddings) {}

  async addDocuments(docs: Document[]) {
    const texts = docs.map(d => d.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);
    for (let i = 0; i < docs.length; i++) {
      this.memoryVectors.push({
        content: docs[i].pageContent,
        metadata: docs[i].metadata,
        embedding: embeddings[i]
      });
    }
  }

  async similaritySearch(query: string, k = 4): Promise<Document[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const results = this.memoryVectors.map(vec => {
      const similarity = this.cosineSimilarity(queryEmbedding, vec.embedding);
      return { doc: new Document({ pageContent: vec.content, metadata: vec.metadata }), similarity };
    });

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, k).map(r => r.doc);
  }

  async similaritySearchWithScore(query: string, k = 4): Promise<[Document, number][]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const results = this.memoryVectors.map(vec => {
      const similarity = this.cosineSimilarity(queryEmbedding, vec.embedding);
      return { doc: new Document({ pageContent: vec.content, metadata: vec.metadata }), similarity };
    });

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, k).map(r => [r.doc, r.similarity] as [Document, number]);
  }

  private cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Loads the VectorStore from disk if it exists.
 */
export async function loadVectorStore(embeddings: OllamaEmbeddings): Promise<SimpleVectorStore> {
  const store = new SimpleVectorStore(embeddings);
  try {
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      const data = fs.readFileSync(VECTOR_STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      store.memoryVectors = parsed;
    }
  } catch (e) {
    console.error("Failed to load vector store from disk:", e);
  }
  return store;
}

/**
 * Saves the VectorStore back to disk.
 */
export async function saveVectorStore(store: SimpleVectorStore): Promise<void> {
  try {
    const dir = path.dirname(VECTOR_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(store.memoryVectors, null, 2));
  } catch (e) {
    console.error("Failed to save vector store to disk:", e);
  }
}

/**
 * Chunks text and ingests it into the provided vector store.
 */
export async function ingestDocument(
  store: SimpleVectorStore,
  text: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.createDocuments([text], [metadata]);
  await store.addDocuments(chunks);
}
