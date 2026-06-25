$ErrorActionPreference = 'Stop'

$casesPath = "C:\Users\New\Desktop\sber\mvp\smoke_cases.json"
$outPath = "C:\Users\New\Desktop\sber\mvp\smoke_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

# Читаем JSON как UTF-8 (BOM-aware)
$casesRaw = [System.IO.File]::ReadAllText($casesPath, [System.Text.Encoding]::UTF8)
$cases = $casesRaw | ConvertFrom-Json

$results = New-Object System.Collections.Generic.List[object]

foreach ($case in $cases) {
  $name = $case.name
  $body = $case.body
  $to = if ($case.PSObject.Properties.Name -contains 'to') { [int]$case.to } else { 90 }
  $j = $body | ConvertTo-Json -Depth 5
  $entry = [ordered]@{ name = $name; request = $body; ts = (Get-Date -Format 'HH:mm:ss') }
  try {
    $r = Invoke-WebRequest -Method Post http://127.0.0.1:8000/api/chat/guest -ContentType "application/json; charset=utf-8" -Body $j -UseBasicParsing -TimeoutSec $to
    $parsed = $r.Content | ConvertFrom-Json
    $entry.status = "OK"
    $entry.message = $parsed.message
    $entry.nav = if ($parsed.navigation_path) { ($parsed.navigation_path | ForEach-Object { "$($_.label) -> $($_.url)" }) -join ' / ' } else { "" }
    $entry.buttons = if ($parsed.action_buttons) { ($parsed.action_buttons | ForEach-Object { "$($_.label) -> $($_.url)" }) -join '; ' } else { "" }
    $entry.sources = if ($parsed.sources) { $parsed.sources.Count } else { 0 }
    $entry.form_actions = if ($parsed.form_actions) { ($parsed.form_actions | ForEach-Object { "$($_.field)=$($_.value)" }) -join '; ' } else { "" }
  } catch {
    $entry.status = "FAIL"
    $entry.error = $_.Exception.Message
  }
  $results.Add([pscustomobject]$entry)
  $marker = if ($entry.status -eq "OK") { "OK  " } else { "FAIL" }
  $msg = if ($entry.message) { $entry.message.Substring(0, [Math]::Min(80, $entry.message.Length)) } else { ($entry.error -as [string]) }
  Write-Host ("[{0}] {1} - {2}" -f $marker, $name, $msg)
}

$json = $results | ConvertTo-Json -Depth 6 -Compress
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $json, $utf8)
"==="
$ok = ($results | Where-Object { $_.status -eq "OK" }).Count
$fail = ($results | Where-Object { $_.status -eq "FAIL" }).Count
Write-Host "Total: ok=$ok fail=$fail  |  saved: $outPath" -ForegroundColor Cyan
