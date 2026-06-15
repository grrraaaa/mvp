$token = Get-Content C:\Users\New\Desktop\sber\mvp\token.txt
$authHeader = @{ "Authorization" = "Bearer $token" }

$body = @{
    message = "test"
} | ConvertTo-Json

$start = Get-Date
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/chat/stream" -Method POST -Headers $authHeader -ContentType "application/json" -Body $body -TimeoutSec 30 -ErrorAction Stop
    $elapsed = ((Get-Date) - $start).TotalMilliseconds
    Write-Host ("OK   {0}ms" -f [int]$elapsed)
} catch {
    $elapsed = ((Get-Date) - $start).TotalMilliseconds
    $code = $null
    if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
    Write-Host ("FAIL {0}ms  status={1}  ({2})" -f [int]$elapsed, $code, $_.Exception.Message)
}
