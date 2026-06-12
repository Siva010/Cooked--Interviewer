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
    <div className="min-h-[calc(100vh-60px)] p-0">
      <div className="max-w-[1200px] mx-auto px-6">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="pt-[120px] pb-20 text-center flex flex-col items-center animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[13px] font-semibold text-[var(--text-primary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] border border-[var(--border-bright)]" />
            Traditional prep is dead
            <span className="text-[var(--text-secondary)] ml-1 mono-font">cooked.app/next →</span>
          </div>

          <h1 className="text-[clamp(48px,8vw,92px)] font-bold tracking-[-0.04em] leading-[1.05] mb-6 max-w-[900px] text-[var(--text-primary)]">
            The interview system for engineers and agents
          </h1>

          <p className="text-[22px] text-[var(--text-secondary)] max-w-[700px] mx-auto mb-[60px] leading-relaxed font-normal">
            Purpose-built for planning and passing interviews. Designed for the AI era.
          </p>

          <button
            onClick={() => document.getElementById('setup-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn btn-primary btn-lg rounded-full px-8 py-4"
          >
            Get started
          </button>
        </section>

        {/* ── Setup Section ─────────────────────────────────────── */}
        <div id="setup-section" className="py-[60px] animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Step 1 – Domain */}
            <div className="glass p-10 flex flex-col">
              <h2 className="text-2xl font-bold mb-2 tracking-[-0.02em] text-[var(--text-primary)]">Built for purpose</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-base">
                Choose the domain you want to master. We cover everything from distributed systems to low-level OS details.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDomain(d.id)}
                    className={`px-4 py-2.5 rounded border transition-all duration-150 text-[14px] font-semibold flex items-center gap-2 mono-font ${
                      domain === d.id
                        ? 'border-[var(--primary)] bg-[rgba(59,130,246,0.1)] text-[var(--primary)]'
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <span>{d.emoji}</span>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 – Personality */}
            <div className="glass p-10 flex flex-col">
              <h2 className="text-2xl font-bold mb-2 tracking-[-0.02em] text-[var(--text-primary)]">Powered by AI agents</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-base">
                Select an interviewer persona. From angry staff engineers to strict professors, they will challenge you.
              </p>
              
              <div className="flex flex-col gap-2">
                {PERSONALITY_LIST.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={`p-4 rounded-lg border transition-all duration-150 text-left flex items-center gap-4 ${
                      personality === p.id
                        ? 'border-[var(--primary)] bg-[rgba(59,130,246,0.05)]'
                        : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-bright)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="flex-1">
                      <div className={`text-base font-bold display-font ${personality === p.id ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                        {p.name}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] mt-0.5 mono-font">
                        {p.title}
                      </div>
                    </div>
                    {personality === p.id && (
                      <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-auto pt-8">
                <button
                  onClick={handleStart}
                  disabled={launching}
                  className={`btn btn-primary w-full text-base p-4 flex justify-center items-center gap-2 ${launching ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
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
        <section className="mt-[60px] pb-[100px] border-b border-[var(--border)] animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-[clamp(32px,5vw,48px)] font-bold tracking-[-0.03em] mb-6 max-w-[800px] text-[var(--text-primary)]">
            A new species of interview tool. <span className="text-[var(--text-secondary)]">Purpose-built for modern engineers with AI workflows at its core, Cooked sets a new standard for prep.</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-[60px]">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="py-8 border-t border-[var(--border)]">
                <div className="text-[13px] text-[var(--primary)] font-semibold tracking-[0.05em] mb-8 mono-font">
                  FIG 0.{i+1}
                </div>
                {/* Abstract visualization box instead of colorful icons */}
                <div className="h-[180px] mb-8 flex items-center justify-center border border-[var(--border)] rounded bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                  <div className="text-[var(--primary)]">{f.icon}</div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)] display-font">{f.title}</h3>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="pt-20 pb-10 px-6 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <div className="w-8 h-8 rounded bg-[var(--primary)] relative overflow-hidden" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-6 display-font">Product</div>
            <div className="flex flex-col gap-4">
              {["Intake", "Plan", "Build", "Diffs", "Monitor"].map(l => (
                <a key={l} href="#" className="text-sm text-[var(--text-secondary)] no-underline transition-colors duration-200 hover:text-[var(--text-primary)]">{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-6 display-font">Features</div>
            <div className="flex flex-col gap-4">
              {["Asks", "Agents", "Insights", "Mobile", "Integrations"].map(l => (
                <a key={l} href="#" className="text-sm text-[var(--text-secondary)] no-underline transition-colors duration-200 hover:text-[var(--text-primary)]">{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-6 display-font">Company</div>
            <div className="flex flex-col gap-4">
              {["About", "Customers", "Careers", "Blog", "Method"].map(l => (
                <a key={l} href="#" className="text-sm text-[var(--text-secondary)] no-underline transition-colors duration-200 hover:text-[var(--text-primary)]">{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-6 display-font">Resources</div>
            <div className="flex flex-col gap-4">
              {["Download", "Documentation", "Developers", "Status", "Enterprise"].map(l => (
                <a key={l} href="#" className="text-sm text-[var(--text-secondary)] no-underline transition-colors duration-200 hover:text-[var(--text-primary)]">{l}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-[100px] pt-8 border-t border-[var(--border)] flex gap-6">
          {["Privacy", "Terms", "DPA", "AUP"].map(l => (
            <a key={l} href="#" className="text-sm text-[var(--text-muted)] no-underline hover:text-[var(--text-primary)] transition-colors">{l}</a>
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
