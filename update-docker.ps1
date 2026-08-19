[CmdletBinding()]
param(
  [string]$ProjectName = "tesla-cockpit",
  [string[]]$ComposeFiles = @((Join-Path $PSScriptRoot "compose.yaml")),
  [switch]$Build,
  [switch]$SkipGitPull
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command 执行失败，退出代码 $LASTEXITCODE。"
  }
}

Push-Location $PSScriptRoot
try {
  if (-not $SkipGitPull) {
    Invoke-Checked git @("pull", "--ff-only")
  }

  $composeArgs = @("compose", "-p", $ProjectName)
  foreach ($file in $ComposeFiles) {
    $resolved = (Resolve-Path -LiteralPath $file).Path
    $composeArgs += @("-f", $resolved)
  }

  if ($Build) {
    Invoke-Checked docker ($composeArgs + @("up", "-d", "--build", "cockpit"))
  } else {
    & docker image inspect tesla-cockpit:local *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "尚未找到 tesla-cockpit:local 镜像，请首次运行时加上 -Build。"
    }
    Invoke-Checked docker ($composeArgs + @("up", "-d", "--no-build", "--force-recreate", "cockpit"))
  }

  Invoke-Checked docker ($composeArgs + @("ps", "cockpit"))
} finally {
  Pop-Location
}
