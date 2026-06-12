"use client";
import { useEffect, useState } from "react";
import { BarChart2, Target, TrendingUp, AlertTriangle, Star, Clock, Zap, Brain } from "lucide-react";
import { computeAnalytics } from "@/lib/db";
import Link from "next/link";

export default function AnalyticsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof computeAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    computeAnalytics().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <BarChart2 size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
          <div style={{ color: "var(--text-secondary)", fontSize: "18px", fontWeight: "bold", fontFamily: "Space Grotesk, sans-serif" }}>Crunching your data...</div>
        </div>
      </div>
    );
  }

  if (!data || data.total_questions === 0) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "80px auto",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 24 }}>📊</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}>No data yet</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.7, fontSize: 16 }}>
          Complete your first interview session to see your analytics.
          The more you practice, the more insights you unlock.
        </p>
        <Link href="/" className="btn btn-primary btn-lg">
          Start Your First Session <Zap size={16} />
        </Link>
      </div>
    );
  }

  const accuracyColor =
    data.overall_accuracy >= 75 ? "var(--success)"
    : data.overall_accuracy >= 50 ? "var(--warning)"
    : "var(--danger)";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginBottom: 8,
            fontFamily: "Space Grotesk, sans-serif",
            color: "var(--text-primary)"
          }}
        >
          Your Progress
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Track your improvement. Face your weaknesses.
        </p>
      </div>

      {/* Top Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <StatCard
          icon="🎯"
          label="Questions Answered"
          value={data.total_questions.toString()}
          color="var(--primary)"
        />
        <StatCard
          icon="🔥"
          label="Current Streak"
          value={data.streak.toString()}
          color="var(--warning)"
        />
      </div>



      {/* Active Recall / Spaced Repetition */}
      <div className="glass" style={{ padding: 28, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Brain size={20} color="var(--primary)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}>Spaced Repetition & Recall</h2>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
          Your responses are automatically classified based on their last score. Focus heavily on revising the &quot;Poor Responses&quot; bucket before your interviews.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          
          {/* Poor Responses Bucket */}
          <div style={{ background: "rgba(220, 38, 38, 0.05)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)", marginBottom: 12 }}>Poor Responses (&lt; 5)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {data.poor_responses.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>None! Great job.</p> : data.poor_responses.map((m, index) => (
                <Link href={`/interview?domain=${encodeURIComponent(m.domain)}&question_id=${encodeURIComponent(m.question_id)}`} key={m.question_id} style={{ textDecoration: "none" }}>
                  <div className="card-lift" style={{ background: "var(--surface)", padding: 10, borderRadius: 6, fontSize: 13, border: "1px solid var(--border)", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{index + 1}. {m.question_text || m.subdomain}</div>
                    <div style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, marginTop: 4 }}>Last Score: {m.last_score}/10</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Satisfied Responses Bucket */}
          <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--warning)", marginBottom: 12 }}>Satisfied Answers (5-7)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {data.satisfied_responses.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No questions here.</p> : data.satisfied_responses.map((m, index) => (
                <Link href={`/interview?domain=${encodeURIComponent(m.domain)}&question_id=${encodeURIComponent(m.question_id)}`} key={m.question_id} style={{ textDecoration: "none" }}>
                  <div className="card-lift" style={{ background: "var(--surface)", padding: 10, borderRadius: 6, fontSize: 13, border: "1px solid var(--border)", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{index + 1}. {m.question_text || m.subdomain}</div>
                    <div style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, marginTop: 4 }}>Last Score: {m.last_score}/10</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Perfect Responses Bucket */}
          <div style={{ background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--success)", marginBottom: 12 }}>Perfect Responses (8+)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {data.perfect_responses.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No perfects yet.</p> : data.perfect_responses.map((m, index) => (
                <Link href={`/interview?domain=${encodeURIComponent(m.domain)}&question_id=${encodeURIComponent(m.question_id)}`} key={m.question_id} style={{ textDecoration: "none" }}>
                  <div className="card-lift" style={{ background: "var(--surface)", padding: 10, borderRadius: 6, fontSize: 13, border: "1px solid var(--border)", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{index + 1}. {m.question_text || m.subdomain}</div>
                    <div style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, marginTop: 4 }}>Last Score: {m.last_score}/10</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <div
      className="glass card-lift"
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8, borderTop: `4px solid ${color}` }}
    >
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color, letterSpacing: "-0.02em", fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</div>
    </div>
  );
}
