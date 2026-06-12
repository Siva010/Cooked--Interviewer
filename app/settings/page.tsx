"use client";
import { useEffect, useState } from "react";
import { Settings, Key, Volume2, Brain, Save, CheckCircle, Eye, EyeOff, Play, Mic, Bot, AlertCircle } from "lucide-react";
import { getSettings, saveSettings, clearAllProgress } from "@/lib/db";
import { AppSettings, PersonalityId } from "@/types";
import { PERSONALITIES } from "@/lib/personalities";
import { speak } from "@/lib/tts";
import { VoiceSelect } from "@/components/settings/VoiceSelect";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    llm_provider: "gemini",
    gemini_api_key: "",
    custom_endpoint: "http://localhost:11434/v1",
    custom_model: "llama3.1",
    personality: "angry_staff",
    voice_enabled: false,
    tts_provider: "browser",
    custom_tts_endpoint: "http://localhost:5050/v1/audio/speech",
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
  });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  async function handleSave() {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClearProgress() {
    if (confirm("Are you sure you want to completely erase all your interview history and statistics? This cannot be undone.")) {
      setClearing(true);
      await clearAllProgress();
      setTimeout(() => {
        setClearing(false);
        alert("Progress successfully cleared.");
      }, 500);
    }
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Configure your interview experience.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* AI Configuration */}
        <section className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Key size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>AI Configuration</h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>LLM Provider</div>
            <select
              value={settings.llm_provider}
              onChange={(e) => update("llm_provider", e.target.value as "gemini" | "ollama" | "custom")}
              className="input"
              style={{ width: "100%" }}
            >
              <option value="gemini">Google Gemini (Cloud)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="custom">Custom OpenAI-Compatible</option>
            </select>
          </div>

          {settings.llm_provider === "gemini" ? (
            <div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.7 }}>
                Required for AI-powered evaluation. Get your free key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "underline" }}
                >
                  aistudio.google.com
                </a>
                .
              </p>
              <div style={{ position: "relative" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.gemini_api_key}
                  onChange={(e) => update("gemini_api_key", e.target.value)}
                  placeholder="AIza..."
                  className="input"
                  style={{ paddingRight: 48, fontFamily: settings.gemini_api_key ? "monospace" : "inherit" }}
                />
                <button
                  onClick={() => setShowKey((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {settings.gemini_api_key && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "var(--success)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600
                  }}
                >
                  <CheckCircle size={14} /> API key configured
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Connect to a local LLM runner like Ollama or LM Studio. Ensure the local server is running and CORS is enabled.
              </p>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>API Endpoint (OpenAI format)</div>
                <input
                  type="text"
                  value={settings.custom_endpoint}
                  onChange={(e) => update("custom_endpoint", e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="input"
                  style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace" }}
                />
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                  Note: If using Ollama, ensure you append <strong style={{color:"var(--text-primary)"}}>/v1</strong> to the base URL.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Model Name</div>
                <input
                  type="text"
                  value={settings.custom_model}
                  onChange={(e) => update("custom_model", e.target.value)}
                  placeholder="llama3.1"
                  className="input"
                  style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace" }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Data Ingestion */}
        <section className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Bot size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>Data Ingestion</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Configure your Crawl4AI local docker endpoint to scrape URLs and build Q&A banks.
            </p>
            <div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Crawl4AI Endpoint</div>
              <input
                type="text"
                value={settings.crawl4ai_endpoint}
                onChange={(e) => update("crawl4ai_endpoint", e.target.value)}
                placeholder="http://localhost:11235/crawl"
                className="input"
                style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace" }}
              />
            </div>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Volume2 size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>Voice Settings</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Toggle
              label="Enable Voice Output"
              desc="The interviewer will speak questions and reactions aloud."
              checked={settings.voice_enabled}
              onChange={(v) => update("voice_enabled", v)}
            />

            {settings.voice_enabled && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>TTS Provider</div>
                  <select
                    value={settings.tts_provider}
                    onChange={(e) => update("tts_provider", e.target.value as "browser" | "custom")}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="browser">Browser Default (Free, Offline)</option>
                    <option value="custom">Custom API (Local TTS Server / ElevenLabs)</option>
                  </select>
                </div>

                {settings.tts_provider === "custom" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                      Connect to a local TTS server (like Kokoro) or any OpenAI-compatible API endpoint.
                    </p>
                    <div>
                      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Audio Speech Endpoint</div>
                      <input
                        type="text"
                        value={settings.custom_tts_endpoint}
                        onChange={(e) => update("custom_tts_endpoint", e.target.value)}
                        placeholder="http://localhost:5050/v1/audio/speech"
                        className="input"
                        style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Interviewer Voice ID</div>
                        <VoiceSelect 
                          value={settings.custom_tts_voice} 
                          onChange={(v) => update("custom_tts_voice", v)} 
                          placeholder="af_bella" 
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Reference Voice ID</div>
                        <VoiceSelect 
                          value={settings.reference_voice} 
                          onChange={(v) => update("reference_voice", v)} 
                          placeholder="am_fenrir" 
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                      For Kokoro, try <strong style={{color:"var(--text-primary)"}}>am_fenrir</strong> or <strong style={{color:"var(--text-primary)"}}>am_echo</strong> for a deep, natural, serious male voice.
                    </div>
                  </div>
                ) : (
                  <>
                    <SliderSetting
                      label="Speech Speed"
                      value={settings.voice_speed}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      onChange={(v) => update("voice_speed", v)}
                      display={`${settings.voice_speed.toFixed(1)}x`}
                    />
                    <SliderSetting
                      label="Voice Pitch"
                      value={settings.voice_pitch}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      onChange={(v) => update("voice_pitch", v)}
                      display={settings.voice_pitch.toFixed(2)}
                    />
                    {voices.length > 0 && (
                      <div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Voice</div>
                        <select
                          value={settings.selected_voice}
                          onChange={(e) => update("selected_voice", e.target.value)}
                          className="input"
                        >
                          <option value="">System Default</option>
                          {voices
                            .sort((a, b) => Number(b.localService) - Number(a.localService))
                            .map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.localService ? "⚡" : "☁️"} {v.name} ({v.lang})
                              </option>
                          ))}
                        </select>
                        <div style={{ fontSize: 13, color: "var(--warning)", marginTop: 8 }}>
                          Note: ☁️ Cloud voices ("Online Natural") often fail to play on some browsers due to network/OS restrictions. ⚡ Local voices are highly recommended.
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    onClick={() => speak({
                      text: "Testing interviewer voice.",
                      settings
                    })}
                    className="btn btn-secondary btn-sm"
                  >
                    <Play size={14} /> Test Interviewer Voice
                  </button>
                  {settings.tts_provider === "custom" && (
                    <button
                      onClick={() => speak({
                        text: "Testing reference voice.",
                        settings: { ...settings, custom_tts_voice: settings.reference_voice }
                      })}
                      className="btn btn-secondary btn-sm"
                    >
                      <Play size={14} /> Test Reference Voice
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Microphone & STT */}
        <section className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Mic size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>Microphone & STT</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Speech-to-Text Provider</div>
              <select
                value={settings.stt_provider}
                onChange={(e) => update("stt_provider", e.target.value as "browser" | "custom")}
                className="input"
                style={{ width: "100%" }}
              >
                <option value="browser">Browser Default (Free, Built-in)</option>
                <option value="custom">Custom API (Local Faster-Whisper)</option>
              </select>
            </div>
            {settings.stt_provider === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Connect to a local STT server (like faster-whisper-server) using the OpenAI compatible endpoint.
                </p>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Audio Transcriptions Endpoint</div>
                  <input
                    type="text"
                    value={settings.custom_stt_endpoint}
                    onChange={(e) => update("custom_stt_endpoint", e.target.value)}
                    placeholder="http://localhost:8000/v1/audio/transcriptions"
                    className="input"
                    style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace" }}
                  />
                </div>
                <Toggle
                  label="Real-Time Streaming (WebSockets)"
                  desc="Streams audio instantly. The endpoint URL will be automatically converted to use ws:// or wss://"
                  checked={settings.stt_streaming}
                  onChange={(v) => update("stt_streaming", v)}
                />
              </div>
            )}
          </div>
        </section>


        {/* Behavior */}
        <section className="glass" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Settings size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}>Behavior</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Toggle
              label="Show Hints"
              desc="Show keyword hints when your answer score is below 6."
              checked={settings.show_hints}
              onChange={(v) => update("show_hints", v)}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass" style={{ padding: 28, borderColor: "rgba(220, 38, 38, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <AlertCircle size={18} color="var(--danger)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--danger)", fontFamily: "Space Grotesk, sans-serif" }}>Danger Zone</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Reset All Progress</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>Permanently delete all your answered questions, history, and analytics.</div>
            </div>
            <button
              onClick={handleClearProgress}
              disabled={clearing}
              className="btn btn-secondary"
              style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            >
              {clearing ? "Clearing..." : "Reset Progress"}
            </button>
          </div>
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          className="btn btn-primary btn-lg"
          style={{ width: "100%" }}
        >
          {saved ? (
            <><CheckCircle size={18} /> Saved!</>
          ) : (
            <><Save size={18} /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label, desc, checked, onChange,
}: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 99,
          background: checked ? "var(--primary)" : "var(--border)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#ffffff",
            position: "absolute",
            top: 3,
            left: checked ? 23 : 3,
            transition: "left 0.2s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
          }}
        />
      </button>
    </div>
  );
}

function SliderSetting({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--primary)" }}
      />
    </div>
  );
}
