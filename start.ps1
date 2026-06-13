# start.ps1
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Starting Cooked Interviewer Local    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Docker Containers
Write-Host "[1/3] Starting Docker Services (Crawl4AI, TTS, STT)..." -ForegroundColor Yellow
docker-compose up -d

# 2. Check and Start Ollama
Write-Host ""
Write-Host "[2/3] Ensuring Ollama is running..." -ForegroundColor Yellow
$ollamaRunning = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "Ollama is not running. Attempting to start it..." -ForegroundColor Cyan
    # Launch ollama serve in the background
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3 # Give it a moment to start
} else {
    Write-Host "Ollama is already running!" -ForegroundColor Green
}

# 3. Start Next.js App
Write-Host ""
Write-Host "[3/3] Starting Next.js Frontend..." -ForegroundColor Yellow
Write-Host "The app will open in your default browser shortly." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the frontend." -ForegroundColor DarkGray

# Open browser (it will wait a few seconds while dev server starts up)
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Start the dev server
npm run dev
