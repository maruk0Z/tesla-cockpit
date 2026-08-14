$taskName = "TeslaCockpitAutoStart"

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$listeners = Get-NetTCPConnection -LocalPort 3456 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1
Start-ScheduledTask -TaskName $taskName
