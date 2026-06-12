import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getPersonality } from "@/lib/personalities";

export function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-[16px] font-extrabold font-['Space_Grotesk']" style={{ color: color ?? "var(--text-primary)" }}>{value}</div>
      <div className="text-[11px] text-[var(--text-muted)] font-['IBM_Plex_Mono'] uppercase tracking-[0.08em]">{label}</div>
    </div>
  );
}

export function LoadingScreen({ personality }: { personality: ReturnType<typeof getPersonality> }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
      <div className="text-[64px]">{personality.emoji}</div>
      <div className="text-[18px] font-['Space_Grotesk'] text-[var(--text-secondary)] font-bold">Loading your interviewer...</div>
      <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <AlertCircle size={48} color="var(--danger)" />
      <div className="text-[24px] font-bold font-['Space_Grotesk'] text-[var(--text-primary)]">Something went wrong</div>
      <div className="text-[var(--text-secondary)] text-[16px] max-w-[400px] text-center font-['Open_Sans']">{message}</div>
      <Link href="/" className="btn btn-primary mt-4 text-[16px] px-6 py-3">Go Home</Link>
    </div>
  );
}
