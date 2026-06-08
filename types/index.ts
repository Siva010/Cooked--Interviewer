// ─── Question ──────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";
export type Domain =
  | "Operating Systems"
  | "DBMS"
  | "Computer Networks"
  | "OOP"
  | "DSA";

export type PersonalityId =
  | "angry_staff"
  | "strict_prof"
  | "faang_bar"
  | "startup_cto";

export interface Question {
  id: string;
  domain: Domain;
  subdomain: string;
  difficulty: Difficulty;
  question: string;
  ideal_answer: string;
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
  difficulty: Difficulty | "adaptive";
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
  difficulty: Difficulty;
  attempts: number;
  correct_attempts: number;
  last_score: number;
  last_seen: number;
  mastered: boolean;
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
  gemini_api_key: string;
  personality: PersonalityId;
  voice_enabled: boolean;
  voice_speed: number;
  voice_pitch: number;
  selected_voice: string;
  adaptive_difficulty: boolean;
  show_hints: boolean;
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
