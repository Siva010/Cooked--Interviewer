// Text-to-Speech wrapper using Web Speech API

import { AppSettings } from "@/types";

export interface TTSOptions {
  text: string;
  settings: AppSettings;
  onEnd?: () => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;

export async function speak(options: TTSOptions): Promise<void> {
  if (typeof window === "undefined") return;

  // Cancel any ongoing speech
  stopSpeaking();

  if (options.settings.tts_provider === "custom") {
    await speakCustom(options);
  } else {
    speakBrowser(options);
  }
}

async function speakCustom(options: TTSOptions) {
  if (!options.settings.custom_tts_endpoint) {
    console.error("No custom TTS endpoint configured");
    options.onEnd?.();
    return;
  }

  // Split text into chunks to avoid TTS character limits
  const rawChunks = options.text
    .split(/([.!?:;\n]+)/)
    .reduce((acc, part, i) => {
      if (i % 2 === 0) acc.push(part);
      else acc[acc.length - 1] += part;
      return acc;
    }, [] as string[])
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";
  for (const c of rawChunks) {
    // Keep chunks under ~300 chars to be safe for Kokoro/local TTS
    if (currentChunk.length + c.length > 250) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = c;
    } else {
      currentChunk += (currentChunk ? " " : "") + c;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  if (chunks.length === 0) {
    options.onEnd?.();
    return;
  }

  currentAbortController = new AbortController();
  const endpoint = options.settings.custom_tts_endpoint.replace(/\/+$/, "");

  const playChunk = async (index: number) => {
    if (index >= chunks.length || !currentAbortController) {
      options.onEnd?.();
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: currentAbortController.signal,
        body: JSON.stringify({
          model: "tts-1",
          input: chunks[index],
          voice: options.settings.custom_tts_voice || "alloy",
          response_format: "wav",
          speed: options.settings.voice_speed,
        }),
      });

      if (!res.ok) throw new Error(`TTS API error: ${res.statusText}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);

      currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        playChunk(index + 1);
      };

      currentAudio.onerror = () => {
        console.error("Audio playback error");
        URL.revokeObjectURL(url);
        currentAudio = null;
        options.onEnd?.();
      };

      await currentAudio.play();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("TTS fetch aborted");
        return;
      }
      console.error("Failed to play custom TTS chunk:", err);
      options.onEnd?.();
    }
  };

  playChunk(0);
}

function speakBrowser(options: TTSOptions) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.rate = options.settings.voice_speed ?? 1.0;
  utterance.pitch = options.settings.voice_pitch ?? 1.0;
  utterance.volume = 1.0;

  if (options.settings.selected_voice) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((v) => v.name === options.settings.selected_voice);
    if (selectedVoice) utterance.voice = selectedVoice;
  }

  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }

  if (currentAudio) {
    currentAudio.onerror = null;
    currentAudio.onended = null;
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;

  const browserSpeaking = "speechSynthesis" in window && window.speechSynthesis.speaking;
  const audioSpeaking = currentAudio !== null && !currentAudio.paused;

  return browserSpeaking || audioSpeaking;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return [];
  return window.speechSynthesis.getVoices();
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}
