# Рестарт фронта + бэка (MVP, локально) — финальная версия
$ErrorActionPreference = "Continue"

$Root = "C:\Users\New\Desktop\sber\mvp"
$Backend = "$Root\backend"
$Frontend = "$Root\frontend"
$LogBOut = "$Root\logs_backend.out"
$LogBErr = "$Root\logs_backend.err"
$LogFOut = "$Root\logs_frontend.out"
$LogFErr = "$Root\logs_frontend.err"

# Прибиваем всё что есть на наших портах
foreach ($port in 8000, 3000) {
  $pids = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
          Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    if ($p) {
      Write-Host "kill pid=$p (port $port)" -ForegroundColor DarkYellow
      Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
  }
}
Start-Sleep -Seconds 1

# Бэк
Write-Host "==> backend :8000" -ForegroundColor Cyan
$backendJob = Start-Process -FilePath "cmd" -ArgumentList "/c","cd /d `"$Backend`" && uvicorn main:app --reload --host 127.0.0.1 --port 8000 2>>`"$LogBErr`" 1>>`"$LogBOut`"" -PassThru -WindowStyle Hidden
Write-Host "    backend pid=$($backendJob.Id)"

# Фронт
Write-Host "==> frontend :3000" -ForegroundColor Cyan
$frontendJob = Start-Process -FilePath "cmd" -ArgumentList "/c","cd /d `"$Frontend`" && npm run dev 2>>`"$LogFErr`" 1>>`"$LogFOut`"" -PassThru -WindowStyle Hidden
Write-Host "    frontend pid=$($frontendJob.Id)"

Write-Host ""
Write-Host "Ждём 10 сек..." -ForegroundColor Green
Start-Sleep -Seconds 10

$running = @()
foreach ($port in 8000, 3000) {
  $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if ($c) {
    $proc = Get-Process -Id $c[0].OwningProcess -ErrorAction SilentlyContinue
    $running += "$port : $($proc.ProcessName)"
  } else {
    $running += "$port : DOWN"
  }
}
$running | ForEach-Object { Write-Host $_ -ForegroundColor Green }

Write-Host ""
Write-Host "Логи:" -ForegroundColor Green
Write-Host "  $LogBOut"
Write-Host "  $LogFOut"
