import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export const KOKORO_VOICES = [
  { id: "af_heart", name: "af_heart", gender: "🚺", icon: "💖", quality: "", grade: "A" },
  { id: "af_alloy", name: "af_alloy", gender: "🚺", icon: "", quality: "B", grade: "C" },
  { id: "af_aoede", name: "af_aoede", gender: "🚺", icon: "", quality: "B", grade: "C+" },
  { id: "af_bella", name: "af_bella", gender: "🚺", icon: "🔥", quality: "A", grade: "A-" },
  { id: "af_jessica", name: "af_jessica", gender: "🚺", icon: "", quality: "C", grade: "D" },
  { id: "af_kore", name: "af_kore", gender: "🚺", icon: "", quality: "B", grade: "C+" },
  { id: "af_nicole", name: "af_nicole", gender: "🚺", icon: "🎧", quality: "B", grade: "B-" },
  { id: "af_nova", name: "af_nova", gender: "🚺", icon: "", quality: "B", grade: "C" },
  { id: "af_river", name: "af_river", gender: "🚺", icon: "", quality: "C", grade: "D" },
  { id: "af_sarah", name: "af_sarah", gender: "🚺", icon: "", quality: "B", grade: "C+" },
  { id: "af_sky", name: "af_sky", gender: "🚺", icon: "", quality: "B", grade: "C-" },
  { id: "am_adam", name: "am_adam", gender: "🚹", icon: "", quality: "D", grade: "F+" },
  { id: "am_echo", name: "am_echo", gender: "🚹", icon: "", quality: "C", grade: "D" },
  { id: "am_eric", name: "am_eric", gender: "🚹", icon: "", quality: "C", grade: "D" },
  { id: "am_fenrir", name: "am_fenrir", gender: "🚹", icon: "", quality: "B", grade: "C+" },
  { id: "am_liam", name: "am_liam", gender: "🚹", icon: "", quality: "C", grade: "D" },
  { id: "am_michael", name: "am_michael", gender: "🚹", icon: "", quality: "B", grade: "C+" },
  { id: "am_onyx", name: "am_onyx", gender: "🚹", icon: "", quality: "C", grade: "D" },
  { id: "am_puck", name: "am_puck", gender: "🚹", icon: "", quality: "B", grade: "C+" },
  { id: "am_santa", name: "am_santa", gender: "🚹", icon: "", quality: "C", grade: "D-" },
];

export function VoiceSelect({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = KOKORO_VOICES.filter(v => v.id.toLowerCase().includes(search.toLowerCase()) || v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="input flex items-center justify-between cursor-pointer"
        onClick={() => { setOpen(!open); setSearch(""); }}
        style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", paddingRight: 8 }}
      >
        <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>{value || placeholder}</span>
        <ChevronDown size={16} color="var(--text-muted)" />
      </div>

      {open && (
        <div 
          className="absolute z-50 mt-1 glass overflow-hidden rounded-xl shadow-2xl"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)", width: 340, left: 0 }}
        >
          <div className="p-2 border-b border-[var(--border)]">
            <input 
              autoFocus
              type="text" 
              className="input w-full" 
              placeholder="Search voices..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ height: 32, fontSize: 14, background: "var(--bg-secondary)" }}
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto p-1">
            <div className="grid grid-cols-[100px_1fr_20px] gap-2 px-3 py-2 text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)] mb-1">
              <div>Name</div>
              <div>Traits</div>
              <div></div>
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[14px] text-[var(--text-muted)]">No voices found in directory</div>
            ) : (
              filtered.map(v => (
                <div 
                  key={v.id}
                  className="grid grid-cols-[100px_1fr_20px] items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                >
                  <div className="font-mono text-[14px]" style={{ color: value === v.id ? "var(--primary)" : "var(--text-primary)" }}>{v.name}</div>
                  <div className="text-[14px] flex items-center gap-1">{v.gender} {v.icon}</div>
                  <div className="flex justify-end">
                    {value === v.id && <Check size={16} color="var(--primary)" />}
                  </div>
                </div>
              ))
            )}
            {search.length > 0 && !KOKORO_VOICES.some(v => v.id.toLowerCase() === search.toLowerCase()) && (
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors mt-1"
                style={{ borderTop: "1px dashed var(--border)" }}
                onClick={() => {
                  onChange(search);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-mono text-[14px] text-[var(--text-primary)]">Use custom: "{search}"</span>
                </div>
                <div className="flex justify-end">
                  {value === search && <Check size={16} color="var(--primary)" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
