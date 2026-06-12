import fs from "fs";
import path from "path";
import LandingClient from "./LandingClient";
import type { Domain } from "@/types";

export const dynamic = "force-dynamic";

const domainMap: Record<string, string[]> = {
  "Operating Systems": ["os"],
  "DBMS & SQL": ["dbms"],
  "Languages": ["languages"],
  "Cloud & DevOps": ["cloud_devops"],
  "AI & ML": ["ai_llms"],
  "Security": ["security"],
  "Computer Networks": ["cn"],
  "OOP": ["oop"],
  "System Design": ["system_design"],
  "Software Engineering": ["software_engineering"],
  "DSA": ["dsa"],
  "Backend": ["backend"]
};

function countQuestions(dir: string, counts: Record<string, number>): number {
    let total = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                total += countQuestions(fullPath, counts);
            } else if (entry.isFile() && fullPath.endsWith('.json')) {
                try {
                    const arr = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    if (Array.isArray(arr)) {
                        total += arr.length;
                        const dirname = path.basename(dir);
                        for (const [dom, folders] of Object.entries(domainMap)) {
                            if (folders.includes(dirname)) {
                                counts[dom] += arr.length;
                            }
                        }
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
    return total;
}

export default async function LandingPage() {
  const counts: Record<string, number> = {};
  for (const k of Object.keys(domainMap)) counts[k] = 0;

  const dataDir = path.join(process.cwd(), "public", "data");
  const totalCount = countQuestions(dataDir, counts);

  const DOMAINS: { id: Domain | "All Domains"; label: string; emoji: string; count: number; color: string }[] = [
    { id: "Operating Systems", label: "Operating Systems", emoji: "⚙️", count: counts["Operating Systems"] || 0, color: "#8866ff" },
    { id: "DBMS & SQL", label: "DBMS & SQL", emoji: "🗄️", count: counts["DBMS & SQL"] || 0, color: "#4488ff" },
    { id: "Languages", label: "Languages", emoji: "💻", count: counts["Languages"] || 0, color: "#ff8800" },
    { id: "Cloud & DevOps", label: "Cloud & DevOps", emoji: "☁️", count: counts["Cloud & DevOps"] || 0, color: "#00ccff" },
    { id: "AI & ML", label: "AI & ML", emoji: "🤖", count: counts["AI & ML"] || 0, color: "#ff44cc" },
    { id: "Security", label: "Security", emoji: "🛡️", count: counts["Security"] || 0, color: "#44aa44" },
    { id: "Computer Networks", label: "Networks", emoji: "🌐", count: counts["Computer Networks"] || 0, color: "#22ffaa" },
    { id: "OOP", label: "OOP", emoji: "🧩", count: counts["OOP"] || 0, color: "#ffaa22" },
    { id: "System Design", label: "System Design", emoji: "🏗️", count: counts["System Design"] || 0, color: "#66ccff" },
    { id: "Software Engineering", label: "Software Eng", emoji: "📐", count: counts["Software Engineering"] || 0, color: "#cc44ff" },
    { id: "DSA", label: "DSA", emoji: "📊", count: counts["DSA"] || 0, color: "#ff4466" },
    { id: "Backend", label: "Backend", emoji: "🔌", count: counts["Backend"] || 0, color: "#cccccc" },
    { id: "All Domains", label: "All Domains", emoji: "🎯", count: totalCount, color: "#aa44ff" },
  ];

  const roundedTotal = Math.floor(totalCount / 100) * 100;
  const STATS = [
    { value: `${roundedTotal}+`, label: "Questions", icon: "📚" },
    { value: "12", label: "Domains", icon: "🎯" },
    { value: "4", label: "Personalities", icon: "🎭" },
    { value: "∞", label: "Sessions", icon: "🔄" },
  ];

  return <LandingClient DOMAINS={DOMAINS} STATS={STATS} />;
}
