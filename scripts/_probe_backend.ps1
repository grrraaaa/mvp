try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 10
    Write-Output "STATUS: $($r.StatusCode)"
    Write-Output "BODY:"
    Write-Output $r.Content
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Output "RESP: $($reader.ReadToEnd())"
    }
}
