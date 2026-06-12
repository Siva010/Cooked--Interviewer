import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  QuestionProgress,
  TopicMastery,
  Session,
  AppSettings,
} from "@/types";

interface CookedDB extends DBSchema {
  question_progress: {
    key: string;
    value: QuestionProgress;
    indexes: { by_domain: string; by_subdomain: string };
  };
  topic_mastery: {
    key: string;
    value: TopicMastery;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { by_domain: string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

let db: IDBPDatabase<CookedDB> | null = null;

async function getDB(): Promise<IDBPDatabase<CookedDB>> {
  if (db) return db;
  db = await openDB<CookedDB>("cooked-interviewer", 1, {
    upgrade(database) {
      // Question Progress
      const qpStore = database.createObjectStore("question_progress", {
        keyPath: "question_id",
      });
      qpStore.createIndex("by_domain", "domain");
      qpStore.createIndex("by_subdomain", "subdomain");

      // Topic Mastery
      database.createObjectStore("topic_mastery", { keyPath: "topic" });

      // Sessions
      const sessStore = database.createObjectStore("sessions", {
        keyPath: "id",
      });
      sessStore.createIndex("by_domain", "domain");

      // Settings
      database.createObjectStore("settings", { keyPath: "key" });
    },
    blocking() {
      db?.close();
      db = null;
    },
    terminated() {
      db = null;
    }
  });
  return db;
}

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  llm_provider: "gemini",
  gemini_api_key: "",
  custom_endpoint: "http://localhost:11434/v1",
  custom_model: "qwen2.5:3b",
  personality: "angry_staff",
  voice_enabled: false,
  tts_provider: "browser",
  custom_tts_endpoint: "http://localhost:8880/v1/audio/speech",
  custom_tts_voice: "af_bella",
  stt_provider: "browser",
  custom_stt_endpoint: "http://localhost:8000/v1/audio/transcriptions",
  stt_streaming: true,
  voice_speed: 1.0,
  voice_pitch: 1.0,
  selected_voice: "",
  reference_voice: "am_fenrir",
  show_hints: true,
  crawl4ai_endpoint: "http://localhost:11235/crawl",
  theme: "system",
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const stored = await db.get("settings", "main");
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", { ...settings, key: "main" } as AppSettings & { key: string });
}

// ─── Question Progress ────────────────────────────────────────────────────────

export async function getQuestionProgress(
  questionId: string
): Promise<QuestionProgress | undefined> {
  const db = await getDB();
  return db.get("question_progress", questionId);
}

export async function upsertQuestionProgress(
  progress: QuestionProgress
): Promise<void> {
  const db = await getDB();
  await db.put("question_progress", progress);
}

export async function getAllProgress(): Promise<QuestionProgress[]> {
  const db = await getDB();
  return db.getAll("question_progress");
}

export async function getProgressByDomain(
  domain: string
): Promise<QuestionProgress[]> {
  const db = await getDB();
  return db.getAllFromIndex("question_progress", "by_domain", domain);
}

// ─── Topic Mastery ────────────────────────────────────────────────────────────

export async function getTopicMastery(
  topic: string
): Promise<TopicMastery | undefined> {
  const db = await getDB();
  return db.get("topic_mastery", topic);
}

export async function getAllTopicMastery(): Promise<TopicMastery[]> {
  const db = await getDB();
  return db.getAll("topic_mastery");
}

export async function upsertTopicMastery(mastery: TopicMastery): Promise<void> {
  const db = await getDB();
  await db.put("topic_mastery", mastery);
}

export async function updateTopicMastery(
  topic: string,
  score: number,
  correct: boolean
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("topic_mastery", topic);
  if (existing) {
    const newTotal = existing.total + 1;
    const newCorrect = existing.correct + (correct ? 1 : 0);
    await db.put("topic_mastery", {
      topic,
      correct: newCorrect,
      total: newTotal,
      avg_score: (existing.avg_score * existing.total + score) / newTotal,
      last_seen: Date.now(),
    });
  } else {
    await db.put("topic_mastery", {
      topic,
      correct: correct ? 1 : 0,
      total: 1,
      avg_score: score,
      last_seen: Date.now(),
    });
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDB();
  return db.getAll("sessions");
}

export async function getRecentSessions(limit = 10): Promise<Session[]> {
  const all = await getAllSessions();
  return all
    .filter((s) => s.ended_at)
    .sort((a, b) => (b.ended_at ?? 0) - (a.ended_at ?? 0))
    .slice(0, limit);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function computeAnalytics() {
  const [allProgress, allTopics, allSessions] = await Promise.all([
    getAllProgress(),
    getAllTopicMastery(),
    getAllSessions(),
  ]);

  const completedSessions = allSessions.filter((s) => s.ended_at);
  const totalQuestions = allProgress.length;
  const totalAnswered = allProgress.reduce((sum, p) => sum + p.attempts, 0);
  const totalCorrect = allProgress.reduce(
    (sum, p) => sum + p.correct_attempts,
    0
  );
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const sortedByScore = [...allTopics].sort((a, b) => a.avg_score - b.avg_score);
  const weakTopics = sortedByScore.slice(0, 5);
  const strongTopics = sortedByScore.slice(-5).reverse();

  const recentMistakes = allProgress
    .filter((p) => p.attempts > 0 && p.last_score < 6)
    .sort((a, b) => b.last_seen - a.last_seen)
    .slice(0, 10);

  const questionTextMap = new Map<string, string>();
  for (const session of allSessions) {
    for (const q of session.questions) {
      if (q.question && q.question.id) {
        questionTextMap.set(q.question.id, q.question.question);
      }
    }
  }

  // Active Recall / Spaced Repetition Buckets
  const poor_responses = allProgress
    .filter(p => p.attempts > 0 && p.last_score < 5)
    .sort((a, b) => a.last_score - b.last_score)
    .map(p => ({ ...p, question_text: questionTextMap.get(p.question_id) }));
    
  const satisfied_responses = allProgress
    .filter(p => p.attempts > 0 && p.last_score >= 5 && p.last_score < 8)
    .sort((a, b) => a.last_score - b.last_score)
    .map(p => ({ ...p, question_text: questionTextMap.get(p.question_id) }));
    
  const perfect_responses = allProgress
    .filter(p => p.attempts > 0 && p.last_score >= 8)
    .sort((a, b) => b.last_score - a.last_score)
    .map(p => ({ ...p, question_text: questionTextMap.get(p.question_id) }));

  // Improvement curve (last 14 days)
  const now = Date.now();
  const curve: { date: string; score: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now - i * 86400000);
    const dateStr = day.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dayStart = new Date(day.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 86400000;
    const daySessions = completedSessions.filter(
      (s) => s.started_at >= dayStart && s.started_at < dayEnd
    );
    const dayQuestions = daySessions.flatMap((s) => s.questions);
    const avgScore =
      dayQuestions.length > 0
        ? dayQuestions.reduce(
            (sum, q) => sum + (q.evaluation?.overall ?? 0),
            0
          ) / dayQuestions.length
        : 0;
    curve.push({ date: dateStr, score: Math.round(avgScore * 10) });
  }

  return {
    total_questions: totalAnswered,
    total_sessions: completedSessions.length,
    overall_accuracy: overallAccuracy,
    domain_stats: [],
    weak_topics: weakTopics,
    strong_topics: strongTopics,
    recent_mistakes: recentMistakes,
    streak: 0,
    improvement_curve: curve,
    poor_responses,
    satisfied_responses,
    perfect_responses,
  };
}

export async function clearAllProgress() {
  const db = await getDB();
  const tx = db.transaction(["question_progress", "topic_mastery", "sessions"], "readwrite");
  await tx.objectStore("question_progress").clear();
  await tx.objectStore("topic_mastery").clear();
  await tx.objectStore("sessions").clear();
  await tx.done;
}
