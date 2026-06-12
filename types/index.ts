// ─── Question ──────────────────────────────────────────────────────────────

export type Domain = string;

export type PersonalityId = "angry_staff";

export interface Question {
  id: string;
  domain: Domain;
  subdomain: string;
  question: string;
  ideal_answer?: string;
  keywords: string[];
  common_mistakes: string[];
  followups: string[];
  roasts: Record<PersonalityId, string>;
}

// ─── Evaluation ────────────────────────────────────────────────────────────

export interface EvaluationResult {
  correctness: number;   // 0–10
  depth: number;         // 0–10
  interview_readiness: number; // 0–10
  overall: number;       // 0–10
  roast: string;
  hint?: string;
  strong_points?: string[];
  weak_points?: string[];
  needs_followup: boolean;
  is_fallback?: boolean;
  dynamic_followup?: string;
  rag_failed?: boolean;
}

// ─── Session ────────────────────────────────────────────────────────────────

export interface SessionQuestion {
  question: Question;
  user_answer: string;
  evaluation: EvaluationResult;
  timestamp: number;
  followup_triggered: boolean;
}

export interface Session {
  id: string;
  domain: Domain | "All Domains";
  personality: PersonalityId;
  started_at: number;
  ended_at?: number;
  questions: SessionQuestion[];
}

// ─── Progress / Memory ──────────────────────────────────────────────────────

export interface QuestionProgress {
  question_id: string;
  domain: Domain;
  subdomain: string;
  attempts: number;
  correct_attempts: number;
  last_score: number;
  last_seen: number;
  mastered: boolean;
  question_text?: string;
}

export interface TopicMastery {
  topic: string; // domain or subdomain
  correct: number;
  total: number;
  avg_score: number;
  last_seen: number;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface AppSettings {
  llm_provider: "gemini" | "ollama" | "custom";
  gemini_api_key: string;
  custom_endpoint: string;
  custom_model: string;
  personality: PersonalityId;
  voice_enabled: boolean;
  tts_provider: "browser" | "custom";
  custom_tts_endpoint: string;
  custom_tts_voice: string;
  stt_provider: "browser" | "custom";
  custom_stt_endpoint: string;
  stt_streaming: boolean;
  voice_speed: number;
  voice_pitch: number;
  selected_voice: string;
  reference_voice: string;
  show_hints: boolean;
  crawl4ai_endpoint: string;
  theme?: "light" | "dark" | "system";
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  total_questions: number;
  total_sessions: number;
  overall_accuracy: number;
  domain_stats: DomainStat[];
  weak_topics: TopicMastery[];
  strong_topics: TopicMastery[];
  recent_mistakes: QuestionProgress[];
  streak: number;
  improvement_curve: { date: string; score: number }[];
  poor_responses: QuestionProgress[];
  satisfied_responses: QuestionProgress[];
  perfect_responses: QuestionProgress[];
}

export interface DomainStat {
  domain: Domain;
  total: number;
  correct: number;
  accuracy: number;
  avg_score: number;
}

// ─── Interview State ─────────────────────────────────────────────────────────

export type InterviewPhase =
  | "idle"
  | "loading"
  | "ready"
  | "asking"
  | "answering"
  | "evaluating"
  | "evaluated"
  | "followup";

export interface InterviewState {
  phase: InterviewPhase;
  current_question: Question | null;
  current_answer: string;
  current_evaluation: EvaluationResult | null;
  current_followup: string | null;
  session: Session | null;
  card_index: number;
}
