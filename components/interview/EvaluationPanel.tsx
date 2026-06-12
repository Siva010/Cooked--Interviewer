import { useState } from "react";
import { ChevronRight, X, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Question, EvaluationResult, AppSettings } from "@/types";
import { getPersonality } from "@/lib/personalities";
import { speak, stopSpeaking } from "@/lib/tts";
import { Loader2, AlertCircle } from "lucide-react";

function formatIdealAnswer(answer: string) {
  if (!answer) return "";
  
  if (answer.includes('\n') || answer.includes('- ') || answer.includes('* ')) {
    return answer.split('\n').map(line => {
      const trimmed = line.trimEnd();
      const isDivider = /^[-_*]{3,}$/.test(trimmed);
      const hasPunctuation = /[.!?:]\s*[*_]*$/.test(trimmed);
      if (trimmed.length > 0 && !hasPunctuation && !trimmed.startsWith('#') && !isDivider) {
        return trimmed + ".";
      }
      return line;
    }).join('\n');
  }

  return answer
    .split(/\.\s+/)
    .filter(Boolean)
    .map(s => {
      const trimmed = s.trim();
      return `- ${trimmed}${/[.!?]$/.test(trimmed) ? '' : '.'}`;
    })
    .join('\n');
}

function sanitizeForSpeech(text: string) {
  // Find where the references section starts (e.g. "### References", "References:", "- References.")
  const refMatch = text.match(/(?:\n|^)\s*(?:#|\-|\*)*\s*References?:?\.?\s*(?:\n|$)/i);
  let cleanedText = refMatch ? text.substring(0, refMatch.index) : text;

  return cleanedText
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/https?:\/\/[^\s]+/g, ''); // remove naked URLs
}

export function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[14px] font-semibold text-[var(--text-secondary)]">{label}</span>
        <span className="text-[14px] font-bold" style={{ color }}>{value}/10</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function EvaluationPanel({
  evaluation,
  personality,
  onNext,
  isFollowup,
  question,
  settings,
}: {
  evaluation: EvaluationResult;
  personality: ReturnType<typeof getPersonality>;
  onNext: () => void;
  isFollowup: boolean;
  question: Question;
  settings: AppSettings;
}) {
  const overall = evaluation.overall;
  const color = overall >= 7 ? "var(--success)" : overall >= 5 ? "var(--warning)" : "var(--danger)";
  const label = overall >= 7 ? "Strong" : overall >= 5 ? "Passable" : "Failed";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [dynamicAnswer, setDynamicAnswer] = useState<string | null>(null);
  const [isRag, setIsRag] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleViewIdealResponse() {
    setIsModalOpen(true);
    // If the question doesn't have a hardcoded ideal_answer, fetch it dynamically via RAG
    if (!question.ideal_answer && !dynamicAnswer && !isGenerating) {
      setIsGenerating(true);
      try {
        const res = await fetch("/api/ideal_answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.question, settings })
        });
        if (res.ok) {
          const data = await res.json();
          setDynamicAnswer(data.answer);
          setIsRag(data.isRag);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)] w-full">
      {evaluation.is_fallback && (
        <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-[var(--danger)] px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="text-[14px]">
            <strong className="font-bold block mb-1">LLM Evaluation Unavailable</strong>
            Could not reach the evaluation server. Your answer was graded using a primitive keyword-matching fallback system.
          </div>
        </div>
      )}

      {evaluation.rag_failed && !evaluation.is_fallback && (
        <div className="bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.3)] text-[var(--warning)] px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="text-[14px]">
            <strong className="font-bold block mb-1">Context Unavailable</strong>
            The RAG documentation server is offline. The LLM evaluated your answer using its base knowledge without local project context.
          </div>
        </div>
      )}

      {/* Roast */}
      <div
        className="glass"
        style={{
          borderLeft: `4px solid ${color}`,
          padding: "24px",
          boxShadow: "var(--shadow-md)"
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[24px]">{personality.emoji}</span>
          <span className="text-[14px] font-bold text-[var(--text-primary)] font-['Space_Grotesk']">{personality.name} says:</span>
        </div>
        <p className="text-[16px] text-[var(--text-primary)] leading-relaxed italic font-['Open_Sans'] bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
          &ldquo;{evaluation.roast}&rdquo;
        </p>
      </div>

      <button 
        onClick={handleViewIdealResponse} 
        className="btn btn-secondary w-full" 
        style={{ padding: "16px 32px", fontSize: "16px" }}
      >
        ✨ View Ideal Response
      </button>

      {/* Scores */}
      <div className="glass shadow-lg" style={{ padding: "28px" }}>
        <div className="flex items-center justify-between mb-6">
          <span className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Evaluation</span>
          <div
            className="flex items-baseline gap-1 text-[32px] font-black font-['Space_Grotesk'] tracking-tight"
            style={{ color }}
          >
            {overall}<span className="text-[18px] opacity-50">/10</span>
            <span className="chip text-[12px] ml-3" style={{ background: color + "15", borderColor: color + "40", color }}>
              {label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ScoreBar label="Correctness" value={evaluation.correctness} color={evaluation.correctness >= 7 ? "var(--success)" : evaluation.correctness >= 5 ? "var(--warning)" : "var(--danger)"} />
          <ScoreBar label="Depth" value={evaluation.depth} color={evaluation.depth >= 7 ? "var(--success)" : evaluation.depth >= 5 ? "var(--warning)" : "var(--danger)"} />
          <ScoreBar label="Interview Readiness" value={evaluation.interview_readiness} color={evaluation.interview_readiness >= 7 ? "var(--success)" : evaluation.interview_readiness >= 5 ? "var(--warning)" : "var(--danger)"} />
        </div>

        {/* Strong points only */}
        {evaluation.strong_points?.length ? (
          <div className="mt-6 bg-[rgba(22,163,74,0.05)] border border-[rgba(22,163,74,0.2)] rounded-lg p-4">
            <div className="text-[13px] font-bold text-[var(--success)] mb-3 flex items-center gap-2">
              <CheckCircle size={16} /> Strong Points
            </div>
            {evaluation.strong_points.map((p) => (
              <div key={p} className="text-[14px] text-[var(--text-primary)] mb-2 pl-6 relative">
                <span className="absolute left-2 top-[6px] w-[4px] h-[4px] rounded-full bg-[var(--success)]"></span>
                {p}
              </div>
            ))}
          </div>
        ) : null}


      </div>

      {/* Next */}
      <button onClick={onNext} className="btn btn-primary w-full mt-2 flex-col gap-1" style={{ padding: "16px 32px", fontSize: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex items-center gap-2">
          {isFollowup ? "Next Follow-up" : "Next Topic"} <ChevronRight size={18} />
        </div>
        <div className="text-[11px] opacity-60 font-['IBM_Plex_Mono'] mt-0.5 tracking-wide uppercase">
          (Or scroll down ↓)
        </div>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center animate-[slideUp_0.2s_ease-out]"
          style={{ background: "rgba(17, 24, 39, 0.4)", backdropFilter: "blur(8px)", padding: "24px" }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass relative w-full overflow-y-auto shadow-2xl"
            style={{ padding: "48px", background: "var(--surface)", maxWidth: "48rem", maxHeight: "85vh", border: "1px solid var(--border-bright)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              style={{ top: "20px", right: "20px", padding: "8px", color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}
            >
              <X size={24} />
            </button>
            
            <h2 className="text-[28px] font-bold text-[var(--text-primary)] border-b border-[var(--border)] font-['Space_Grotesk']" style={{ marginBottom: "32px", paddingBottom: "16px" }}>
              ✨ Ideal Response
            </h2>

            {evaluation.weak_points?.length ? (
              <div style={{ marginBottom: "40px" }} className="bg-[rgba(220,38,38,0.05)] border border-[rgba(220,38,38,0.2)] rounded-lg p-5">
                <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ marginBottom: "16px", color: "var(--danger)" }}>
                  <XCircle size={18} /> Missing Key Points
                </h3>
                <ul className="list-none flex flex-col gap-3">
                  {evaluation.weak_points.map((p) => (
                    <li key={p} className="text-[15px] leading-relaxed relative pl-6 text-[var(--text-primary)]">
                      <span className="absolute left-1 top-[8px] w-[4px] h-[4px] rounded-full bg-[var(--danger)]"></span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Determine the answer to show */}
            {(question?.ideal_answer || dynamicAnswer || isGenerating) && (
              <div>
                <h3 className="text-[18px] font-bold font-['Space_Grotesk']" style={{ marginBottom: "20px", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="flex items-center gap-2">
                    Reference Answer 
                    {!question?.ideal_answer && dynamicAnswer && (
                      <span className={`chip text-white text-[10px] ${isRag ? 'bg-[var(--primary)]' : 'bg-[var(--warning)]'}`}>
                        {isRag ? 'RAG-LLM Generated' : 'Purely LLM'}
                      </span>
                    )}
                  </span>
                  {(question?.ideal_answer || dynamicAnswer) && (
                    <button 
                      onClick={() => {
                        if (isPlayingRef) {
                          stopSpeaking();
                          setIsPlayingRef(false);
                        } else {
                          setIsPlayingRef(true);
                          speak({
                            text: sanitizeForSpeech(formatIdealAnswer(question.ideal_answer || dynamicAnswer || "")),
                            settings: { ...settings, custom_tts_voice: settings.reference_voice },
                            onEnd: () => setIsPlayingRef(false)
                          });
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ color: isPlayingRef ? "var(--primary)" : "var(--text-primary)" }}
                      title={isPlayingRef ? "Stop playback" : "Listen to reference answer"}
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </h3>
                <div className="text-[16px] leading-relaxed markdown-content bg-[var(--bg-secondary)] p-6 rounded-lg border border-[var(--border)]" style={{ color: "var(--text-primary)" }}>
                  {isGenerating ? (
                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <Loader2 className="animate-spin" size={20} />
                      Synthesizing ideal answer from local documentation...
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline" />
                      }}
                    >
                      {formatIdealAnswer(question.ideal_answer || dynamicAnswer || "")}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

function XCircle({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}
