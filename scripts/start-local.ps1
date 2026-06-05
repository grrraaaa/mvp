# Локальный запуск MVP (полные пути)
# Использование: powershell -ExecutionPolicy Bypass -File "C:\Users\New\Desktop\sber\mvp\scripts\start-local.ps1"

$ErrorActionPreference = "Stop"
$Root = "C:\Users\New\Desktop\sber\mvp"
$Compose = Join-Path $Root "docker-compose.yml"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "==> Postgres (Docker)" -ForegroundColor Cyan
docker compose -f $Compose up -d postgres
Start-Sleep -Seconds 3

Write-Host "==> Backend init_db" -ForegroundColor Cyan
Push-Location $Backend
$env:DATABASE_URL = "postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber"
python -c "import asyncio; from db.database import init_db; asyncio.run(init_db()); print('init_db OK')"
Pop-Location

Write-Host ""
Write-Host "Запустите в двух терминалах:" -ForegroundColor Green
Write-Host "  Backend:  cd `"$Backend`"; `$env:DATABASE_URL='postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber'; uvicorn main:app --reload --port 8000"
Write-Host "  Frontend: cd `"$Frontend`"; npm run dev"
Write-Host ""
Write-Host "  Login:    http://localhost:3000/login"
Write-Host "  demo/demo | ipivanov/ip123 | buhplus/buh123"
