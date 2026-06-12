"use client";
import { useState, useEffect } from "react";
import { Database, Link as LinkIcon, Loader2, CheckCircle, AlertCircle, Home } from "lucide-react";
import { getSettings } from "@/lib/db";
import { AppSettings } from "@/types";
import Link from "next/link";

export default function RagAdminPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ totalChunks: number; history?: any[] } | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const [settings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setAppSettings);
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/ingest");
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !settings) return;
    
    setLoading(true);
    setStatus({ type: null, msg: "" });
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ingest");
      
      setStatus({ type: "success", msg: data.message });
      setUrl("");
      fetchStats();
    } catch (error: any) {
      setStatus({ type: "error", msg: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="btn btn-ghost btn-sm" style={{ color: "var(--text-secondary)" }}>
          <Home size={18} />
        </Link>
        <h1 className="text-[32px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Local RAG Ingestion</h1>
      </div>

      <div className="glass shadow-lg p-8 mb-8" style={{ borderTop: "4px solid var(--primary)" }}>
        <div className="flex items-center gap-3 mb-6">
          <Database size={24} color="var(--primary)" />
          <h2 className="text-[20px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Vector Database Status</h2>
        </div>
        <div className="text-[36px] font-black text-[var(--text-primary)] font-['Space_Grotesk']">
          {stats ? stats.totalChunks : "..."}
        </div>
        <div className="text-[14px] text-[var(--text-secondary)] font-semibold mt-1">
          Total Embedded Document Chunks
        </div>
      </div>

      <form onSubmit={handleIngest} className="glass shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon size={20} color="var(--text-primary)" />
          <h2 className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Ingest Documentation URL</h2>
        </div>
        
        <p className="text-[15px] text-[var(--text-secondary)] mb-6 leading-relaxed">
          Paste the URL of an official documentation page (e.g., React Docs, AWS Guides). The system will use your local Crawl4AI instance to scrape it, chunk it, embed it using Ollama, and save it to the local vector store.
        </p>

        <div className="flex gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://react.dev/reference/react/useState"
            className="input flex-1 font-['IBM_Plex_Mono']"
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading || !url} className="btn btn-primary min-w-[140px]">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Ingesting...</> : "Ingest URL"}
          </button>
        </div>

        {status.type && (
          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 border ${status.type === 'success' ? 'bg-[rgba(22,163,74,0.05)] border-[rgba(22,163,74,0.2)] text-[var(--success)]' : 'bg-[rgba(220,38,38,0.05)] border-[rgba(220,38,38,0.2)] text-[var(--danger)]'}`}>
            {status.type === 'success' ? <CheckCircle size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <div className="text-[15px] leading-relaxed">{status.msg}</div>
          </div>
        )}
      </form>

      {stats?.history && stats.history.length > 0 && (
        <div className="glass shadow-lg p-8 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Database size={20} color="var(--text-primary)" />
            <h2 className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Ingestion History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="text-left py-3 font-semibold">URL</th>
                  <th className="text-left py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {[...stats.history].reverse().map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 px-2 font-['IBM_Plex_Mono'] text-[13px] text-[var(--primary)] max-w-[300px] truncate">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                    </td>
                    <td className="py-3 px-2 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
