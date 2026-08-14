param(
  [string]$Root = $PSScriptRoot,
  [long]$MaxBytes = 5MB,
  [int]$Keep = 5
)

$logs = @("tesla-cockpit.log", "tesla-cockpit.err.log")
foreach ($name in $logs) {
  $current = Join-Path $Root $name
  if (-not (Test-Path -LiteralPath $current)) { continue }
  if ((Get-Item -LiteralPath $current).Length -lt $MaxBytes) { continue }

  $oldest = "$current.$Keep"
  if (Test-Path -LiteralPath $oldest) {
    Remove-Item -LiteralPath $oldest -Force
  }
  for ($index = $Keep - 1; $index -ge 1; $index--) {
    $source = "$current.$index"
    if (Test-Path -LiteralPath $source) {
      Move-Item -LiteralPath $source -Destination "$current.$($index + 1)" -Force
    }
  }
  Move-Item -LiteralPath $current -Destination "$current.1" -Force
}
