"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ChevronRight, Brain, Target } from "lucide-react";
import { PERSONALITIES } from "@/lib/personalities";
import type { Domain, PersonalityId } from "@/types";

const PERSONALITY_LIST = Object.values(PERSONALITIES);

type DomainData = { id: Domain | "All Domains"; label: string; emoji: string; count: number; color: string };
type StatData = { value: string; label: string; icon: string };

export default function LandingClient({ DOMAINS, STATS }: { DOMAINS: DomainData[], STATS: StatData[] }) {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain | "All Domains">("Operating Systems");
  const [personality, setPersonality] = useState<PersonalityId>("angry_staff");
  const [launching, setLaunching] = useState(false);

  function handleStart() {
    setLaunching(true);
    const params = new URLSearchParams({ domain, personality });
    setTimeout(() => router.push(`/interview?${params}`), 400);
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", padding: "0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Hero ───────────────────────────────────────────── */}
        <section
          style={{
            paddingTop: 120,
            paddingBottom: 80,
            textAlign: "center",
            animation: "slideUp 0.6s cubic-bezier(0.4,0,0.2,1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
            padding: "6px 12px",
            borderRadius: "99px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)"
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', border: '1px solid var(--border-bright)'
            }} />
            Traditional prep is dead
            <span style={{ color: "var(--text-secondary)", marginLeft: 4, fontFamily: 'IBM Plex Mono, monospace' }}>cooked.app/next →</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(48px, 8vw, 92px)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: 24,
              maxWidth: 900,
              color: "var(--text-primary)"
            }}
          >
            The interview system for engineers and agents
          </h1>

          <p
            style={{
              fontSize: 22,
              color: "var(--text-secondary)",
              maxWidth: 700,
              margin: "0 auto 60px",
              lineHeight: 1.5,
              fontWeight: 400
            }}
          >
            Purpose-built for planning and passing interviews. Designed for the AI era.
          </p>

          <button
            onClick={() => document.getElementById('setup-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn btn-primary btn-lg"
            style={{
              borderRadius: "99px",
              padding: "16px 32px",
            }}
          >
            Get started
          </button>
        </section>

        {/* ── Setup Section ─────────────────────────────────────── */}
        <div
          id="setup-section"
          style={{
            padding: "60px 0",
            animation: "slideUp 0.8s cubic-bezier(0.4,0,0.2,1) 0.1s both",
          }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            alignItems: "stretch"
          }}>
            {/* Step 1 – Domain */}
            <div className="glass" style={{
              padding: 40,
              display: "flex",
              flexDirection: "column",
            }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Built for purpose</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 16 }}>
                Choose the domain you want to master. We cover everything from distributed systems to low-level OS details.
              </p>
              
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDomain(d.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 4,
                      border: `1px solid ${domain === d.id ? "var(--primary)" : "var(--border)"}`,
                      background: domain === d.id ? "rgba(59, 130, 246, 0.1)" : "var(--bg-card)",
                      color: domain === d.id ? "var(--primary)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontSize: 14,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}
                    onMouseOver={(e) => {
                      if (domain !== d.id) {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.border = '1px solid var(--border-bright)';
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (domain !== d.id) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.border = '1px solid var(--border)';
                        e.currentTarget.style.background = 'var(--bg-card)';
                      }
                    }}
                  >
                    <span>{d.emoji}</span>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 – Personality */}
            <div className="glass" style={{
              padding: 40,
              display: "flex",
              flexDirection: "column",
            }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Powered by AI agents</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 16 }}>
                Select an interviewer persona. From angry staff engineers to strict professors, they will challenge you.
              </p>
              
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {PERSONALITY_LIST.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    style={{
                      padding: "16px",
                      borderRadius: 8,
                      border: `1px solid ${personality === p.id ? "var(--primary)" : "var(--border)"}`,
                      background: personality === p.id ? "rgba(59, 130, 246, 0.05)" : "var(--bg-card)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                    onMouseOver={(e) => {
                      if (personality !== p.id) {
                        e.currentTarget.style.border = '1px solid var(--border-bright)';
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (personality !== p.id) {
                        e.currentTarget.style.border = '1px solid var(--border)';
                        e.currentTarget.style.background = 'var(--bg-card)';
                      }
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{p.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: personality === p.id ? "var(--primary)" : "var(--text-primary)", fontFamily: 'Space Grotesk, sans-serif' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                        {p.title}
                      </div>
                    </div>
                    {personality === p.id && (
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)' }} />
                    )}
                  </button>
                ))}
              </div>
              
              <div style={{ marginTop: "auto", paddingTop: 32 }}>
                <button
                  onClick={handleStart}
                  disabled={launching}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    fontSize: 16,
                    padding: "16px",
                    cursor: launching ? "not-allowed" : "pointer",
                    opacity: launching ? 0.7 : 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {launching ? (
                    "Initiating session..."
                  ) : (
                    <>Start Interview <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mid Section ───────────────────────────────────────── */}
        <section style={{ 
          marginTop: 60, 
          paddingBottom: 100,
          borderBottom: "1px solid var(--border)",
          animation: "slideUp 0.8s cubic-bezier(0.4,0,0.2,1) 0.2s both" 
        }}>
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 24,
              maxWidth: 800,
              color: "var(--text-primary)"
            }}
          >
            A new species of interview tool. <span style={{ color: "var(--text-secondary)" }}>Purpose-built for modern engineers with AI workflows at its core, Cooked sets a new standard for prep.</span>
          </h2>
          
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginTop: 60
            }}
          >
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ 
                padding: "32px 0",
                borderTop: "1px solid var(--border)"
              }}>
                <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 32, fontFamily: "IBM Plex Mono, monospace" }}>
                  FIG 0.{i+1}
                </div>
                {/* Abstract visualization box instead of colorful icons */}
                <div style={{ 
                  height: 180, 
                  marginBottom: 32, 
                  background: "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                  borderRadius: 4
                }}>
                  <div style={{ color: "var(--primary)" }}>{f.icon}</div>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)", fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</h3>
                <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        padding: "80px 24px 40px",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <div style={{ width: 32, height: 32, borderRadius: '4px', background: 'var(--primary)', position: 'relative', overflow: 'hidden' }}>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, fontFamily: 'Space Grotesk, sans-serif' }}>Product</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["Intake", "Plan", "Build", "Diffs", "Monitor"].map(l => (
                <a key={l} href="#" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, fontFamily: 'Space Grotesk, sans-serif' }}>Features</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["Asks", "Agents", "Insights", "Mobile", "Integrations"].map(l => (
                <a key={l} href="#" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, fontFamily: 'Space Grotesk, sans-serif' }}>Company</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["About", "Customers", "Careers", "Blog", "Method"].map(l => (
                <a key={l} href="#" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, fontFamily: 'Space Grotesk, sans-serif' }}>Resources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["Download", "Documentation", "Developers", "Status", "Enterprise"].map(l => (
                <a key={l} href="#" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>{l}</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "100px auto 0", borderTop: "1px solid var(--border)", paddingTop: 32, display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "DPA", "AUP"].map(l => (
            <a key={l} href="#" style={{ fontSize: 14, color: "var(--text-muted)", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Zap size={40} strokeWidth={1.5} />,
    title: "Built for purpose",
    desc: "Linear is shaped by the practices and principles of world-class product teams.",
  },
  {
    icon: <Brain size={40} strokeWidth={1.5} />,
    title: "Powered by AI agents",
    desc: "Designed for workflows shared by humans and agents. From drafting PRDs to pushing PRs.",
  },
  {
    icon: <Target size={40} strokeWidth={1.5} />,
    title: "Designed for speed",
    desc: "Reduces noise and restores momentum to help teams ship with high velocity and focus.",
  },
];
