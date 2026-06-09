Add-Type -AssemblyName System.Web
$base = 'http://127.0.0.1:8000'
$enc = [System.Text.Encoding]::UTF8
$client = New-Object System.Net.WebClient
$client.Encoding = $enc

function Get-Test([string]$Path, [string]$Desc) {
    Write-Output ''
    Write-Output "=== $Desc ==="
    Write-Output "GET $Path"
    try {
        $resp = $client.DownloadString("$base$Path")
        if ($resp.Length -lt 2000) {
            Write-Output $resp
        } else {
            Write-Output "  (truncated to first 2000 of $($resp.Length) bytes)"
            Write-Output ($resp.Substring(0, 2000))
        }
    } catch {
        $ex = $_.Exception
        if ($ex.Response) {
            $stream = $ex.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, $enc)
            Write-Output '  HTTP error. body:'
            Write-Output "  $($reader.ReadToEnd())"
        } else {
            Write-Output "  ERROR: $($ex.Message)"
        }
    }
}

Get-Test '/api/banking/documents?org_id=demo' 'all docs for demo'
Get-Test '/api/banking/search?q=%D0%BF%D0%BE%D0%BA%D0%B0%D0%B6%D0%B8%20%D0%BE%D1%82%D1%87%D1%91%D1%82%20%D0%BD%D0%BE%D0%BC%D0%B5%D1%80%20211&org_id=demo' "search 'отчёт номер 211'"
Get-Test '/api/banking/search?q=%D0%BD%D0%B0%D0%B9%D0%B4%D0%B8%20%E2%84%96211&org_id=demo' "search 'найди №211'"
Get-Test '/api/banking/search?q=%D0%BF%D0%BE%D0%BA%D0%B0%D0%B6%D0%B8%20%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%20211&org_id=demo' "search 'документ 211'"
Get-Test '/api/banking/search?q=%D0%BF%D0%BE%D0%BA%D0%B0%D0%B6%D0%B8%20%D0%BE%D1%82%D1%87%D1%91%D1%82&org_id=demo' 'no number, just report'
