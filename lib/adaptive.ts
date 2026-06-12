import { Question, Domain, TopicMastery } from "@/types";

// ─── Question Loader ─────────────────────────────────────────────────────────

const questionCache: Map<string, Question[]> = new Map();

const DOMAIN_FILES: Record<string, string[]> = {
  "Operating Systems": ["/data/os/all.json"],
  "DBMS & SQL": ["/data/dbms/all.json"],
  "Computer Networks": ["/data/cn/all.json"],
  "OOP": ["/data/oop/all.json"],
  "DSA": ["/data/dsa/all.json"],
  "Software Engineering": ["/data/software_engineering/all.json"],
  "System Design": ["/data/system_design/all.json"],
  "Languages": ["/data/languages/all.json"],
  "Cloud & DevOps": ["/data/cloud_devops/all.json"],
  "AI & ML": ["/data/ai_llms/all.json"],
  "Security": ["/data/security/all.json"],
  "Backend": ["/data/backend/all.json"],
};

export async function loadQuestionsForDomain(
  domain: Domain
): Promise<Question[]> {
  if (questionCache.has(domain)) {
    return questionCache.get(domain)!;
  }

  const files = DOMAIN_FILES[domain] ?? [];
  const results: Question[] = [];

  for (const file of files) {
    try {
      const res = await fetch(file);
      if (res.ok) {
        const data: Question[] = await res.json();
        results.push(...data);
      }
    } catch (e) {
      console.warn(`Failed to load ${file}:`, e);
    }
  }

  questionCache.set(domain, results);
  return results;
}

export async function loadAllQuestions(): Promise<Question[]> {
  const domains: string[] = Object.keys(DOMAIN_FILES);
  const all = await Promise.all(domains.map(loadQuestionsForDomain));
  return all.flat();
}

// ─── Question Selection ───────────────────────────────────────────────────────

export function selectNextQuestion(
  questions: Question[],
  answeredIds: Set<string>,
  topicMastery: TopicMastery[],
  weaknessBias: boolean = true
): Question | null {
  let pool = [...questions];

  // Filter out recently answered (last 10)
  if (answeredIds.size > 0 && pool.length > answeredIds.size) {
    const recentIds = Array.from(answeredIds).slice(-10);
    pool = pool.filter((q) => !recentIds.includes(q.id));
  }

  if (pool.length === 0) pool = [...questions]; // reset if exhausted

  // Apply Spaced Repetition bias
  if (weaknessBias && topicMastery.length > 0) {
    const now = Date.now();
    // Calculate a weight for each topic based on score and time since last seen
    const topicWeights = new Map<string, number>();
    for (const t of topicMastery) {
      if (t.total === 0) continue;
      
      const hoursSinceSeen = (now - t.last_seen) / (1000 * 60 * 60);
      let weight = 1.0;
      
      if (t.avg_score < 5) {
         weight += 2.0; // High priority for failed topics
      } else if (t.avg_score < 7) {
         weight += 1.0; // Medium priority for weak topics
      }
      
      // SRS: Increase weight based on time since last seen, tempered by score
      const intervalFactor = t.avg_score >= 8 ? 72 : (t.avg_score >= 6 ? 24 : 12); 
      if (hoursSinceSeen > intervalFactor) {
         weight += Math.min(3.0, hoursSinceSeen / intervalFactor);
      }
      
      topicWeights.set(t.topic.toLowerCase(), weight);
    }

    if (topicWeights.size > 0) {
      // Assign weight to each question in the pool
      const poolWithWeights = pool.map(q => {
         const domainWeight = topicWeights.get(q.domain.toLowerCase()) ?? 1.0;
         const subWeight = topicWeights.get(q.subdomain.toLowerCase()) ?? 1.0;
         // Unknown topics (no mastery data) get default weight 1.0
         return { q, weight: Math.max(domainWeight, subWeight) };
      });
      
      // Sort by weight descending, pick from top 30% to maintain some randomness
      poolWithWeights.sort((a, b) => b.weight - a.weight);
      const topCount = Math.max(1, Math.floor(poolWithWeights.length * 0.3));
      const topCandidates = poolWithWeights.slice(0, topCount);
      return topCandidates[Math.floor(Math.random() * topCandidates.length)].q;
    }
  }

  // Random selection from pool if no bias
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
