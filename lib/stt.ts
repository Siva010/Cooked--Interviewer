// Custom Speech-to-Text handler using MediaRecorder and APIs

export class STTRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private ws: WebSocket | null = null;
  private streamingEndpoint: string | null = null;
  public onTranscript?: (text: string) => void;
  public onAudioLevel?: (level: number) => void;
  
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private analyser: AnalyserNode | null = null;

  constructor(streamingEndpoint?: string) {
    this.streamingEndpoint = streamingEndpoint || null;
  }

  async start(): Promise<void> {
    if (typeof window === "undefined" || !navigator.mediaDevices) {
      throw new Error("Audio recording is not supported in this environment");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup WebSocket streaming with 16kHz raw PCM
    if (this.streamingEndpoint) {
      const wsUrl = this.streamingEndpoint.replace(/^http/, "ws");
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text !== undefined && this.onTranscript) {
            this.onTranscript(data.text);
          }
        } catch (e) {
          if (typeof event.data === "string" && this.onTranscript) {
            this.onTranscript(event.data);
          }
        }
      };

      // 16kHz 16-bit PCM conversion
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcm16.buffer);
        }
      };
    } else {
      // Just setup audio context for level meter even without streaming
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    }
    
    // Level meter loop
    const updateLevel = () => {
      if (this.analyser && this.onAudioLevel) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        this.onAudioLevel(sum / dataArray.length);
      }
      this.animationFrameId = requestAnimationFrame(updateLevel);
    };
    updateLevel();

    // Prefer webm format for standard recording
    let mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "audio/mp4"; // Fallback for Safari
    }
    
    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.onAudioLevel) {
        this.onAudioLevel(0);
      }
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        resolve(audioBlob);

        // Cleanup tracks to release microphone
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
      };

      this.mediaRecorder.stop();
    });
  }
}

export async function transcribeAudio(audioBlob: Blob, endpoint: string): Promise<string> {
  if (audioBlob.size === 0) return "";

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");

  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  
  const res = await fetch(cleanEndpoint, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`STT API error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.text || "";
}
