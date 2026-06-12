"use client";
import { useState, useEffect } from "react";
import { Loader2, Bot, Code2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { getSettings } from "@/lib/db";
import { AppSettings, Domain } from "@/types";

const DOMAINS: Domain[] = [
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "OOP",
  "DSA",
];

export default function CrawlAdminPage() {
  const [url, setUrl] = useState("");
  const [domain, setDomain] = useState<Domain>("Backend" as Domain);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<any | null>(null);
  const [resultMarkdown, setResultMarkdown] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"json" | "markdown">("json");
  const [generateQa, setGenerateQa] = useState(true);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleCrawl = async () => {
    if (!settings) return;
    
    if (!url) {
      setError("Please enter a URL to crawl.");
      return;
    }
    if (generateQa && settings.llm_provider === "gemini" && !settings.gemini_api_key) {
      setError("Please configure your Gemini API Key in Settings first to generate Q&As.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultJson(null);
    setResultMarkdown(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          domain,
          crawl4ai_endpoint: settings.crawl4ai_endpoint,
          llm_provider: settings.llm_provider,
          gemini_api_key: settings.gemini_api_key,
          custom_endpoint: settings.custom_endpoint,
          custom_model: settings.custom_model,
          generate_qa: generateQa,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to crawl and generate.");
      }

      setResultJson(data.data);
      setResultMarkdown(data.markdown);
      if (!generateQa) {
        setActiveTab("markdown");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!settings) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", padding: "40px 24px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
          <Bot color="#8866ff" size={36} />
          Crawl4AI Data Ingestion
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 16 }}>
          Scrape any documentation URL using your local Crawl4AI docker container, and use Gemini to auto-generate a Q&A JSON Bank for the interview platform.
        </p>
      </div>

      <div className="glass" style={{ padding: 32, marginBottom: 40 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Target URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://docs.docker.com/get-started/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: "100%", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Target Domain</label>
              <select
                className="input"
                value={domain}
                onChange={(e) => setDomain(e.target.value as Domain)}
                style={{ width: "100%" }}
              >
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>
                Crawl4AI Local Endpoint
              </label>
              <input
                type="text"
                className="input"
                disabled
                value={settings.crawl4ai_endpoint}
                style={{ width: "100%", opacity: 0.7 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="generateQa"
              checked={generateQa}
              onChange={(e) => setGenerateQa(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#8866ff", cursor: "pointer" }}
            />
            <label htmlFor="generateQa" style={{ fontSize: 14, cursor: "pointer" }}>
              Automatically generate Q&A Bank using AI (Gemini or Local Ollama based on Settings)
            </label>
          </div>

          {error && (
            <div style={{ padding: 16, background: "rgba(255, 68, 102, 0.1)", border: "1px solid rgba(255, 68, 102, 0.2)", borderRadius: 12, color: "#ff4466", display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <button
            onClick={handleCrawl}
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: 10 }}
          >
            {loading ? (
              <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> Crawling & Generating...</>
            ) : (
              <><Bot size={20} /> Start Crawl & Generate</>
            )}
          </button>
        </div>
      </div>

      {(resultJson || resultMarkdown) && (
        <div style={{ animation: "slideUp 0.4s ease" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => setActiveTab("json")}
              className={`btn ${activeTab === "json" ? "btn-primary" : "btn-ghost"}`}
            >
              <Code2 size={16} /> JSON Q&A Bank
            </button>
            <button
              onClick={() => setActiveTab("markdown")}
              className={`btn ${activeTab === "markdown" ? "btn-outline" : "btn-ghost"}`}
            >
              <FileText size={16} /> Raw Markdown
            </button>
          </div>

          <div className="glass" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                {activeTab === "json" ? "Generated Output (Ready for all.json)" : "Scraped Content"}
              </span>
              <button
                onClick={() => copyToClipboard(activeTab === "json" ? JSON.stringify(resultJson, null, 2) : resultMarkdown || "")}
                className="btn btn-sm btn-ghost"
              >
                <CheckCircle2 size={14} /> Copy
              </button>
            </div>
            <pre style={{ margin: 0, padding: 24, overflowX: "auto", fontSize: 13, lineHeight: 1.6, maxHeight: 600, overflowY: "auto", fontFamily: "monospace" }}>
              {activeTab === "json" ? JSON.stringify(resultJson, null, 2) : resultMarkdown}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
