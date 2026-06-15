$token = Get-Content C:\Users\New\Desktop\sber\mvp\token.txt
$authHeader = @{ "Authorization" = "Bearer $token" }

$endpoints = @(
    "http://127.0.0.1:8000/api/chat/sessions",
    "http://127.0.0.1:8000/api/chat/history/nonexistent-id"
)

foreach ($u in $endpoints) {
    $start = Get-Date
    try {
        $resp = Invoke-RestMethod -Uri $u -Method GET -Headers $authHeader -TimeoutSec 10 -ErrorAction Stop
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        Write-Host ("OK   {0}ms  {1}" -f [int]$elapsed, $u)
    } catch {
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        $code = $null
        if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
        Write-Host ("FAIL {0}ms  status={1}  {2}" -f [int]$elapsed, $code, $u)
    }
}
