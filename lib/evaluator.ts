import { EvaluationResult, Question } from "@/types";
import { getPersonality } from "@/lib/personalities";
import type { PersonalityId } from "@/types";

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "as", "by", "of", "it", "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those", "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them"]);

function keywordEvaluation(
  question: Question,
  userAnswer: string,
  personalityId: PersonalityId
): EvaluationResult {
  const answer = userAnswer.toLowerCase();
  
  if (!question.keywords || question.keywords.length === 0) {
    const words = userAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
    const lengthScore = Math.min(10, Math.floor(words.length / 5));
    const personality = getPersonality(personalityId);
    const roast = lengthScore >= 7
      ? personality.correct_reactions[Math.floor(Math.random() * personality.correct_reactions.length)]
      : personality.wrong_reactions[Math.floor(Math.random() * personality.wrong_reactions.length)];
      
    return {
      correctness: lengthScore,
      depth: Math.max(0, lengthScore - 2),
      interview_readiness: Math.max(0, lengthScore - 3),
      overall: lengthScore,
      roast,
      hint: "Try explaining your thought process more clearly.",
      strong_points: [],
      weak_points: ["Detailed keywords not available for this follow-up"],
      needs_followup: false,
      is_fallback: true,
    };
  }

  const matched = question.keywords.filter((kw) =>
    answer.includes(kw.toLowerCase())
  );
  const ratio = matched.length / question.keywords.length;
  const correctness = Math.round(ratio * 10);
  const depth = Math.round(ratio * 7);
  const interview_readiness = Math.round(ratio * 8);
  const overall = Math.round(
    correctness * 0.4 + depth * 0.3 + interview_readiness * 0.3
  );

  const personality = getPersonality(personalityId);
  const roast =
    overall >= 7
      ? personality.correct_reactions[
          Math.floor(Math.random() * personality.correct_reactions.length)
        ]
      : personality.wrong_reactions[
          Math.floor(Math.random() * personality.wrong_reactions.length)
        ];

  return {
    correctness,
    depth,
    interview_readiness,
    overall,
    roast,
    hint:
      overall < 6
        ? `Try mentioning: ${question.keywords.slice(0, 3).join(", ")}`
        : undefined,
    strong_points: matched.map((kw) => `Mentioned "${kw}"`),
    weak_points: question.keywords
      .filter((kw) => !answer.includes(kw.toLowerCase()))
      .slice(0, 3)
      .map((kw) => `Missing concept: "${kw}"`),
    needs_followup: overall < 7,
    is_fallback: true,
  };
}

// ─── Main Evaluator ───────────────────────────────────────────────────────────

import { AppSettings } from "@/types";

export async function evaluateAnswer(
  question: Question,
  userAnswer: string,
  personalityId: PersonalityId,
  settings: AppSettings
): Promise<EvaluationResult> {
  if (userAnswer.trim().length < 5) {
    return keywordEvaluation(question, userAnswer, personalityId);
  }

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, userAnswer, personalityId, settings }),
    });

    if (!res.ok) {
      throw new Error(`API Route failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return data;
  } catch (error) {
    console.error("API Evaluation failed, falling back:", error);
    return keywordEvaluation(question, userAnswer, personalityId);
  }
}
