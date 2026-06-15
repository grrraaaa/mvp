$token = Get-Content C:\Users\New\Desktop\sber\mvp\token.txt
$authHeader = @{ "Authorization" = "Bearer $token" }

$endpoints = @(
    "http://127.0.0.1:8000/api/tts/status",
    "http://127.0.0.1:8000/api/banking/accounts",
    "http://127.0.0.1:8000/api/banking/documents",
    "http://127.0.0.1:8000/api/banking/employees",
    "http://127.0.0.1:8000/api/banking/counterparties",
    "http://127.0.0.1:8000/api/banking/notifications?unread_only=true",
    "http://127.0.0.1:8000/api/banking/gateway/payments",
    "http://127.0.0.1:8000/api/banking/org"
)

foreach ($u in $endpoints) {
    $start = Get-Date
    try {
        $resp = Invoke-RestMethod -Uri $u -Method GET -Headers $authHeader -TimeoutSec 10 -ErrorAction Stop
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        if ($null -ne $resp) {
            $count = if ($resp -is [array]) { $resp.Count } elseif ($resp.PSObject.Properties['count']) { $resp.count } else { 1 }
            Write-Host ("OK   {0}ms  count={1}  {2}" -f [int]$elapsed, $count, $u)
        } else {
            Write-Host ("OK   {0}ms  null   {1}" -f [int]$elapsed, $u)
        }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        $code = $null
        if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
        Write-Host ("FAIL {0}ms  status={1}  {2}  ({3})" -f [int]$elapsed, $code, $u, $_.Exception.Message)
    }
}
