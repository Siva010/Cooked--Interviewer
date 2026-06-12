"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Send, ChevronRight, Volume2, VolumeX,
  SkipForward, Home, Loader2, AlertCircle, Search, X
} from "lucide-react";
import { Question, EvaluationResult, Session, PersonalityId, Domain, AppSettings } from "@/types";
import { PERSONALITIES, getPersonality } from "@/lib/personalities";
import { loadQuestionsForDomain, loadAllQuestions, selectNextQuestion } from "@/lib/adaptive";
import { evaluateAnswer } from "@/lib/evaluator";
import { getSettings, saveSession, upsertQuestionProgress, getQuestionProgress, updateTopicMastery, getAllTopicMastery } from "@/lib/db";
import { speak, stopSpeaking } from "@/lib/tts";
import { STTRecorder, transcribeAudio } from "@/lib/stt";
import Link from "next/link";
import { EvaluationPanel } from "@/components/interview/EvaluationPanel";
import { StatPill, LoadingScreen, ErrorScreen } from "@/components/interview/Shared";

type Phase = "loading" | "ready" | "asking" | "answering" | "evaluating" | "evaluated" | "followup";

function formatDomainBadge(domain: string, subdomain: string) {
  if (!domain) return subdomain;
  const commonMap: Record<string, string> = {
    "Operating Systems": "OS",
    "System Design": "SD",
    "Computer Networks": "CN",
    "Data Structures": "DSA",
    "Algorithms": "ALGO",
    "AI & LLMs": "AI/LLM",
    "AI & LLM": "AI/LLM",
    "Frontend": "FE",
    "Backend": "BE",
    "Databases": "SQL",
    "DBMS": "SQL"
  };
  const acronym = commonMap[domain] || domain.split(/\s+/).map(w => w[0]).join('').toUpperCase();
  if (!subdomain || subdomain.toLowerCase() === "general") {
    return acronym;
  }
  return `${acronym} • ${subdomain}`;
}

function InterviewLoader() {
  const searchParams = useSearchParams();
  const domain = searchParams.get("domain") || "Operating Systems";
  const personalityId = (searchParams.get("personality") as PersonalityId) || "angry_staff";
  const targetQuestionId = searchParams.get("question_id") || undefined;

  return <InterviewCore domain={domain as Domain | "All Domains"} personalityId={personalityId} targetQuestionId={targetQuestionId} />;
}

function InterviewCore({ domain, personalityId, targetQuestionId }: { domain: Domain | "All Domains"; personalityId: PersonalityId; targetQuestionId?: string }) {
  const router = useRouter();

  const personality = getPersonality(personalityId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [followupQueue, setFollowupQueue] = useState<Question[]>([]);
  const [totalFollowupsInTopic, setTotalFollowupsInTopic] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [recentScores, setRecentScores] = useState<number[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const recognitionRef = useRef<any>(null);
  const sttRecorderRef = useRef<STTRecorder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const levelIndicatorRef = useRef<HTMLDivElement>(null);

  // Load settings + questions
  useEffect(() => {
    async function init() {
      try {
        const settings = await getSettings();
        setAppSettings(settings);

        const qs =
          domain === "All Domains"
            ? await loadAllQuestions()
            : await loadQuestionsForDomain(domain as Domain);

        if (qs.length === 0) {
          setError("No questions found. Make sure question data files are in /public/data/");
          return;
        }

        setQuestions(qs);

        let first = targetQuestionId ? qs.find(q => q.id === targetQuestionId) : undefined;
        if (!first) {
          const topicMastery = await getAllTopicMastery();
          first = selectNextQuestion(qs, new Set(), topicMastery, false);
        }

        if (first) {
          let maxFollowups = 3;

          let fq: Question[] = [];
          if (maxFollowups > 0) {
            let sameSubdomain = qs.filter(q => q.subdomain === first.subdomain && q.id !== first.id);
            sameSubdomain = sameSubdomain.sort(() => 0.5 - Math.random());
            for(let i=0; i<maxFollowups; i++) {
               if (i < sameSubdomain.length) {
                 fq.push(sameSubdomain[i]);
               } else {
                 const fuStr = first.followups[(i - sameSubdomain.length) % Math.max(1, first.followups.length)];
                 if (fuStr) {
                   fq.push({
                     ...first,
                     id: first.id + "_fu_" + i,
                     question: fuStr,
                     ideal_answer: "",
                     keywords: [],
                     common_mistakes: [],
                     followups: []
                   });
                 }
               }
            }
          }
          setFollowupQueue(fq);
          setTotalFollowupsInTopic(maxFollowups);
        }

        const session: Session = {
          id: Date.now().toString(),
          domain,
          personality: personalityId,
          started_at: Date.now(),
          questions: [],
        };
        setSessionData(session);
        setCurrent(first);
        setPhase("ready");
      } catch (e) {
        setError("Failed to load. Check your setup.");
        console.error(e);
      }
    }
    init();

    // Init speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript + " ";
            }
          }
          if (currentTranscript) {
            setAnswer(prev => (prev + " " + currentTranscript).trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

  }, [domain, personalityId]);

  const toggleListening = async () => {
    if (!appSettings) return;

    if (appSettings.stt_provider === "custom") {
      if (isListening) {
        setIsListening(false);
        if (sttRecorderRef.current) {
          setIsTranscribing(true);
          try {
            const blob = await sttRecorderRef.current.stop();
            // If not streaming, we must manually transcribe the final blob
            if (!appSettings.stt_streaming) {
              const text = await transcribeAudio(blob, appSettings.custom_stt_endpoint);
              if (text) {
                setAnswer((prev) => (prev + " " + text).trim());
              }
            }
          } catch (e) {
            console.error("Transcription failed", e);
          }
          setIsTranscribing(false);
        }
      } else {
        const endpoint = appSettings.stt_streaming ? appSettings.custom_stt_endpoint : undefined;
        sttRecorderRef.current = new STTRecorder(endpoint);
        
        sttRecorderRef.current.onAudioLevel = (level) => {
          if (levelIndicatorRef.current) {
            levelIndicatorRef.current.style.transform = `scaleY(${Math.min(1, level / 128)})`;
          }
        };

        if (appSettings.stt_streaming) {
          sttRecorderRef.current.onTranscript = (text) => {
            setAnswer((prev) => (prev + " " + text).trim());
          };
        }

        try {
          await sttRecorderRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error("Microphone access denied", e);
        }
      }
    } else {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      } else {
        recognitionRef.current?.start();
        setIsListening(true);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!current || !answer.trim() || phase !== "answering") return;
    setPhase("evaluating");

    try {
      const result = await evaluateAnswer(current, answer, personalityId, appSettings!);
      setEvaluation(result);
      setPhase("evaluated");

      // Update progress
      const existing = await getQuestionProgress(current.id);
      const isCorrect = result.overall >= 7;
      await upsertQuestionProgress({
        question_id: current.id,
        domain: current.domain,
        subdomain: current.subdomain,
        attempts: (existing?.attempts ?? 0) + 1,
        correct_attempts: (existing?.correct_attempts ?? 0) + (isCorrect ? 1 : 0),
        last_score: result.overall,
        last_seen: Date.now(),
        mastered: isCorrect && (existing?.attempts ?? 0) >= 1,
      });

      await updateTopicMastery(current.domain, result.overall, isCorrect);
      await updateTopicMastery(current.subdomain, result.overall, isCorrect);

      const newScores = [...recentScores, result.overall].slice(-10);
      setRecentScores(newScores);
      setTotalAnswered((n) => n + 1);
      setCurrentStreak((s) => (isCorrect ? s + 1 : 0));

      if (appSettings?.voice_enabled) {
        speak({
          text: result.roast,
          settings: appSettings
        });
      }

      if (result.needs_followup && result.dynamic_followup) {
        const dynamicQ: Question = {
           ...current,
           id: current.id + "_dyn_fu_" + Date.now(),
           question: result.dynamic_followup,
           ideal_answer: "",
           keywords: [],
           common_mistakes: [],
           followups: [],
           roasts: current.roasts,
        };
        setFollowupQueue(prev => [dynamicQ, ...prev]);
        setTotalFollowupsInTopic(t => t + 1);
      }

      // Update session
      if (sessionData) {
        const updatedSession: Session = {
          ...sessionData,
          questions: [
            ...sessionData.questions,
            {
              question: current,
              user_answer: answer,
              evaluation: result,
              timestamp: Date.now(),
              followup_triggered: result.needs_followup,
            },
          ],
        };
        setSessionData(updatedSession);
        await saveSession(updatedSession);
      }
    } catch (e) {
      setPhase("answering");
      console.error(e);
    }
  }, [current, answer, phase, personalityId, appSettings, recentScores, sessionData]);

  const handleNext = useCallback(async () => {
    if (!current) return;
    const newAnsweredIds = new Set(answeredIds).add(current.id);
    setAnsweredIds(newAnsweredIds);

    let next: Question | null = null;
    let newFollowupQueue = [...followupQueue];

    if (newFollowupQueue.length > 0) {
      next = newFollowupQueue[0];
      newFollowupQueue = newFollowupQueue.slice(1);
      setFollowupQueue(newFollowupQueue);
    } else {
      const topicMastery = await getAllTopicMastery();

      next = selectNextQuestion(questions, newAnsweredIds, topicMastery, true);
      
      if (next) {
        let maxFollowups = 3;

        let fq: Question[] = [];
        if (maxFollowups > 0) {
          let sameSubdomain = questions.filter(q => q.subdomain === next!.subdomain && q.id !== next!.id && !newAnsweredIds.has(q.id));
          sameSubdomain = sameSubdomain.sort(() => 0.5 - Math.random());
          for(let i=0; i<maxFollowups; i++) {
             if (i < sameSubdomain.length) {
               fq.push(sameSubdomain[i]);
             } else {
               const fuStr = next!.followups[(i - sameSubdomain.length) % Math.max(1, next!.followups.length)];
               if (fuStr) {
                 fq.push({
                   ...next!,
                   id: next!.id + "_fu_" + i,
                   question: fuStr,
                   ideal_answer: "",
                   keywords: [],
                   common_mistakes: [],
                   followups: []
                 });
               }
             }
          }
        }
        setFollowupQueue(fq);
        setTotalFollowupsInTopic(maxFollowups);
      }
    }

    if (!next) return;

    stopSpeaking();
    setCurrent(next);
    setAnswer("");
    setEvaluation(null);
    setPhase("asking");
    setCardIndex((i) => i + 1);

    if (appSettings?.voice_enabled) {
      setTimeout(() => speak({
        text: next!.question,
        settings: appSettings
      }), 300);
    }
    textareaRef.current?.focus();
  }, [current, answeredIds, questions, recentScores, appSettings, followupQueue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  // Reels-like scroll to next
  useEffect(() => {
    if (phase !== "evaluated") return;

    let touchStartY = 0;
    let isNavigating = false;

    const triggerNext = () => {
      if (isNavigating) return;
      isNavigating = true;
      handleNext();
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (document.querySelector('.fixed.inset-0.z-50')) return; // Ignore if modal is open
      const isBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;
      if (!isBottom) return;
      const touchEndY = e.touches[0].clientY;
      if (touchStartY - touchEndY > 50) {
        triggerNext();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (document.querySelector('.fixed.inset-0.z-50')) return; // Ignore if modal is open
      const isBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;
      if (isBottom && e.deltaY > 20) {
        triggerNext();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [phase, handleNext]);

  const filteredQuestions = questions.filter(q => 
    q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) return <ErrorScreen message={error} />;
  if (phase === "loading") return <LoadingScreen personality={personality} />;

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] relative overflow-hidden">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[400px] max-w-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-bold text-[18px] font-['Space_Grotesk'] text-[var(--text-primary)]">Question Bank</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="btn btn-ghost btn-sm p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={20}/>
                </button>
              </div>
              <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    placeholder="Search questions or topics..." 
                    className="input w-full pl-9 bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {filteredQuestions.map((q, index) => (
                  <button 
                    key={`${q.id}-${index}`} 
                    className="text-left p-4 rounded-lg bg-[var(--surface)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border)] hover:border-[var(--primary)]"
                    onClick={() => {
                      stopSpeaking();
                      setCurrent(q);
                      setPhase("asking");
                      setAnswer("");
                      setEvaluation(null);
                      setIsSidebarOpen(false);
                      setFollowupQueue([]);
                      setTotalFollowupsInTopic(0);
                      setCardIndex((i) => i + 1);
                      if (appSettings?.voice_enabled) {
                        setTimeout(() => speak({
                          text: q.question,
                          settings: appSettings
                        }), 300);
                      }
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="text-[11px] font-['IBM_Plex_Mono'] text-[var(--primary)] font-bold mb-2 uppercase tracking-wider">
                      {formatDomainBadge(q.domain, q.subdomain)}
                    </div>
                    <div className="text-[14px] text-[var(--text-primary)] leading-snug">{index + 1}. {q.question}</div>
                  </button>
                ))}
                {filteredQuestions.length === 0 && (
                  <div className="text-center text-[var(--text-muted)] mt-10 text-[14px]">No questions found matching "{searchQuery}".</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-ghost btn-sm" style={{ color: "var(--text-secondary)" }}>
            <Home size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-sm text-lg"
              style={{
                background: `var(--bg-secondary)`,
                border: `1px solid var(--border)`,
              }}
            >
              {personality.emoji}
            </div>
            <div>
              <div className="text-[14px] font-bold font-['Space_Grotesk']" style={{ color: "var(--text-primary)" }}>
                {personality.name}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] font-['IBM_Plex_Mono']">{personality.title}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <StatPill label="Questions" value={totalAnswered} />
          <StatPill label="Streak" value={currentStreak} color="var(--primary)" />
          <StatPill label="Domain" value={domain === "All Domains" ? "All" : domain.split(" ")[0]} />

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn btn-ghost btn-sm font-bold text-[var(--text-secondary)] font-['Space_Grotesk']"
          >
            Q List
          </button>

          <button
            onClick={() => setAppSettings(s => s ? { ...s, voice_enabled: !s.voice_enabled } : null)}
            className="btn btn-ghost btn-sm"
            style={{ color: appSettings?.voice_enabled ? "var(--primary)" : "var(--text-muted)" }}
            title={appSettings?.voice_enabled ? "Disable voice" : "Enable voice"}
          >
            {appSettings?.voice_enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 w-full flex justify-center px-6 py-12 relative z-10">
        <div
          className="w-full flex flex-col gap-6 transition-[max-width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            maxWidth: (phase === "evaluating" || phase === "evaluated") ? 1200 : 820,
          }}
        >

        <motion.div
          layout
          transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
          className={`grid gap-6 items-start w-full ${(phase === "evaluating" || phase === "evaluated") ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Question Card */}
        <div
          key={cardIndex}
          className="glass animate-[slideUp_0.4s_cubic-bezier(0.4,0,0.2,1)] transition-colors duration-400 shadow-lg"
          style={{
            borderColor: phase === "evaluated" ? "var(--primary)" : "var(--border)",
            padding: "32px",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "24px" }}>
            <div className="flex flex-wrap gap-2">
              <span className="chip" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", borderColor: "var(--border)", textTransform: "uppercase", fontWeight: "bold", fontSize: "11px" }}>
                {current ? formatDomainBadge(current.domain, current.subdomain) : ""}
              </span>
              {totalFollowupsInTopic > 0 && (
                <span className="chip" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", borderColor: "var(--primary)" }}>
                  {totalFollowupsInTopic - followupQueue.length === 0 ? "Main Question" : `Follow-up ${totalFollowupsInTopic - followupQueue.length} of ${totalFollowupsInTopic}`}
                </span>
              )}
            </div>
            <span className="text-sm text-[var(--text-muted)] font-['IBM_Plex_Mono'] font-medium tracking-wide">
              #{cardIndex + 1}
            </span>
          </div>

          <h2
            className="font-bold leading-snug text-[var(--text-primary)] font-['Space_Grotesk']"
            style={{ fontSize: "clamp(20px, 3vw, 28px)", marginTop: "24px", marginBottom: "32px", letterSpacing: "-0.02em" }}
          >
            {current?.question}
          </h2>

          {phase === "ready" && (
            <button
              onClick={() => { 
                setPhase("asking"); 
                if (appSettings?.voice_enabled && current) {
                  speak({ text: current.question, settings: appSettings });
                }
              }}
              className="btn btn-primary w-full"
              style={{ marginTop: "32px", padding: "16px 32px", fontSize: "16px", borderRadius: "8px" }}
            >
              Start Interview <ChevronRight size={18} />
            </button>
          )}

          {phase === "asking" && (
            <button
              onClick={() => { setPhase("answering"); textareaRef.current?.focus(); }}
              className="btn btn-primary"
              style={{
                marginTop: "32px"
              }}
            >
              Answer <ChevronRight size={16} />
            </button>
          )}
        </div>

          {/* Answer Input */}
          {(phase === "answering" || phase === "evaluating" || phase === "evaluated") && (
            <div
              className="glass flex flex-col animate-[slideUp_0.35s_cubic-bezier(0.4,0,0.2,1)] shadow-lg"
              style={{ padding: "24px", height: phase === "evaluated" ? "100%" : "auto" }}
            >
              <div className="mb-3 text-[14px] text-[var(--text-secondary)] font-bold font-['Space_Grotesk'] tracking-wide uppercase">
                Your Answer
              </div>
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input flex-1 font-['Open_Sans'] text-[16px] leading-relaxed resize-none border-0 shadow-inner"
                style={{ background: "var(--bg-secondary)" }}
                placeholder="Type your answer here... (Ctrl+Enter to submit)"
                rows={phase === "evaluated" ? undefined : 6}
                disabled={phase !== "answering"}
                autoFocus
              />
              {phase !== "evaluated" && (
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-3">
                    {(!appSettings || appSettings.stt_provider === "custom" || recognitionRef.current) && (
                      <button
                        onClick={toggleListening}
                        disabled={phase === "evaluating" || isTranscribing}
                        className={`btn min-w-[110px] relative overflow-hidden`}
                        style={{
                          background: isListening ? "var(--primary)" : "transparent",
                          color: isListening ? "#ffffff" : "var(--text-secondary)",
                          border: isListening ? "none" : "1px solid var(--border)",
                        }}
                      >
                        {isListening && (
                          <div 
                            ref={levelIndicatorRef}
                            className="absolute inset-0 bg-white/20 origin-bottom transition-transform duration-75"
                            style={{ transform: `scaleY(0)` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-1 justify-center">
                          {isTranscribing ? (
                            <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Wait...</>
                          ) : isListening ? (
                            <><MicOff size={16} /> Stop</>
                          ) : (
                            <><Mic size={16} /> Dictate</>
                          )}
                        </div>
                      </button>
                    )}
                    <span className="text-xs text-[var(--text-muted)] font-['IBM_Plex_Mono'] hidden sm:inline-block">
                      Ctrl + Enter to submit
                    </span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!answer.trim() || phase === "evaluating"}
                    className="btn btn-primary min-w-[120px]"
                    style={{ opacity: !answer.trim() ? 0.5 : 1 }}
                  >
                    {phase === "evaluating" ? (
                      <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Evaluating...</>
                    ) : (
                      <><Send size={16} /> Submit</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Evaluation Panel */}
        {phase === "evaluated" && evaluation && current && (
          <EvaluationPanel
            evaluation={evaluation}
            personality={personality}
            onNext={handleNext}
            isFollowup={followupQueue.length > 0}
            question={current}
            settings={appSettings!}
          />
        )}
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 size={32} className="animate-spin text-[var(--primary)]" /></div>}>
      <InterviewLoader />
    </Suspense>
  );
}
