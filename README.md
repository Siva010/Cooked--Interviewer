# 🧑‍🍳 Cooked Interviewer

An AI-driven technical interview platform designed to grill you, roast your mistakes, and prepare you for real-world engineering interviews. It features adaptive questioning, dynamic follow-ups, analytics based on spaced repetition, and an ingestion pipeline to scrape technical docs and generate new interview questions on the fly.

**Privacy First:** This app can be run **100% locally** using [Ollama](https://ollama.com/) for LLM processing and [Crawl4AI](https://github.com/unclecode/crawl4ai) for local web scraping, ensuring your data never leaves your machine.

---

## ✨ Features

- **Dynamic AI Interviewer:** Evaluates your answers, provides hints, points out strengths/weaknesses, and even roasts you based on selected personas (e.g., Angry Staff Engineer, Strict Professor).
- **RAG-Enhanced Evaluation:** Checks your answers against a local Vector Database of technical documentation to ensure absolute factual correctness.
- **Data Ingestion Pipeline:** Submit a URL to scrape docs via Crawl4AI and automatically generate highly technical Q&A pairs. These pairs are instantly appended to your local question bank and the Vector DB.
- **Analytics & Spaced Repetition:** Tracks your progress locally (IndexedDB) and prioritizes topics you struggle with.
- **Voice Capabilities:** Built-in Speech-to-Text (STT) and Text-to-Speech (TTS) for a conversational interview experience.

---

## 🚀 How it Works (Architecture)

1. **Frontend:** Built with Next.js (App Router), React, and Tailwind CSS.
2. **Database:** 
   - Questions are stored in local JSON files under `public/data/`.
   - User progress and analytics are stored in browser `IndexedDB`.
3. **RAG (Retrieval-Augmented Generation):** Uses `@langchain/ollama` and `nomic-embed-text` to chunk and store document embeddings locally in `public/data/vectordb.json`.
4. **AI Generation:** Supports both cloud APIs (Gemini) and Local LLMs (Ollama) for evaluating candidate answers and generating question banks.

### Directory Structure
```text
app/
├── admin/          # Admin UI (Crawl4AI ingestion & RAG management)
├── analytics/      # Analytics & spaced repetition dashboard
├── api/            # API Routes (evaluate, ingest, generate ideal answers)
├── interview/      # Core interview UI (Queue, STT, TTS)
└── settings/       # App configuration (LLM Provider, Voice, etc.)

components/         
├── interview/      # Evaluation panel, loading screens, stat pills
├── layout/         # Navigation bar
└── settings/       # Voice selection dropdowns

lib/
├── adaptive.ts     # SRS logic and adaptive question queueing
├── db.ts           # IndexedDB wrappers for offline analytics
├── evaluator.ts    # Scoring logic and LLM prompt orchestrator
├── personalities.ts# Persona definitions (Angry Staff, CTO, etc.)
├── rag.ts          # Local vector database setup (Ollama embeddings)
├── stt.ts          # Speech-to-Text via WebSpeech API
└── tts.ts          # Text-to-Speech via WebSpeech API
```

---

## 🛠️ Local Environment Setup

Follow these steps to run the platform entirely locally with no external APIs.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.com/) installed locally
- [Docker](https://www.docker.com/) (required for the Crawl4AI web scraper)

### Step 1: Install Dependencies
Clone the repo and install the required npm packages:
```bash
git clone https://github.com/Siva010/Cooked--Interviewer.git
cd "Cooked Interviewer/app"
npm install
```

### Step 2: Configure Ollama Models
Ensure Ollama is running (`ollama serve`). You will need to pull a text generation model (e.g., `llama3` or `mistral`) and the embedding model (`nomic-embed-text`) used for the vector database.
```bash
ollama pull llama3
ollama pull nomic-embed-text
```

### Step 3: Start the Crawl4AI Scraper
To use the automatic Q&A ingestion pipeline, start the Crawl4AI Docker container:
```bash
docker run -p 11225:11225 -d --name crawl4ai unclecode/crawl4ai:basic-amd64
```
*(This exposes the crawler API on `http://localhost:11225/crawl`)*

### Step 4: Run the Application
Start the Next.js development server:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Configure App Settings
1. In the app, click the **Settings** icon (gear) in the navbar.
2. Under **LLM Provider**, select **Local Ollama**.
3. Set your **Custom Endpoint** to `http://localhost:11434` (the default Ollama port).
4. Enter the model you downloaded (e.g., `llama3`) in the **Custom Model Name** field.
5. Save settings!

---

## 🧠 Using the Ingestion Pipeline

To add new technical questions to your database:
1. Navigate to `/admin/crawl` (or click "Ingestion Admin" in settings).
2. Enter a documentation URL (e.g., `https://docs.docker.com/get-started/`).
3. Select the target domain (e.g., Backend, Frontend).
4. Click **Start Crawl & Generate**.

**What happens behind the scenes?**
- **Crawl4AI** downloads and converts the webpage into clean markdown.
- **Ollama** analyzes the markdown to generate strict Q&A pairs (including the ideal answers and common mistakes).
- The markdown is embedded using `nomic-embed-text` and saved to your local `vectordb.json` for RAG evaluation.
- The generated questions are appended to the domain's local JSON bank (`public/data/{domain}/all.json`).

---

## 🎙️ Voice Capabilities (TTS & STT)

The platform supports an immersive, conversational interview experience through built-in Text-to-Speech (TTS) and Speech-to-Text (STT) functionality. 

**How to use it:**
- **Text-to-Speech (TTS):** When enabled via the Volume icon in the interview navigation bar or in Settings, the AI interviewer will vocalize its questions and roasts aloud. 
- **Speech-to-Text (STT):** During the "Answering" phase, click the "Dictate" button to speak your answer instead of typing. The speech will be transcribed into the text area in real-time.

**Configuration:**
By default, the app leverages the free, zero-setup **Browser Native APIs** (`window.speechSynthesis` and `window.SpeechRecognition`) which run completely locally in your browser. 
If you want higher quality or custom voices, you can configure **Custom APIs** in the Settings menu by pointing the app to external TTS/STT endpoints (e.g. OpenAI Whisper or ElevenLabs compatible endpoints).

Enjoy getting cooked! 👨‍🍳🔥
