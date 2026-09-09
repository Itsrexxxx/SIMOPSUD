Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess, @{Name='PID';Expression={$_.OwningProcess}} |
  ForEach-Object {
    Write-Output "PID=$($_.OwningProcess)"
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Output "Name=$($proc.Name)"
      Write-Output "Cmd=$($proc.CommandLine)"
    } else {
      Write-Output "(process exited)"
    }
  }
