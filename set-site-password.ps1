param(
  [string]$Password,
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json')
)

$iterations = 210000

function New-Base64Url([byte[]]$bytes) {
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-RandomBytes([int]$count) {
  $bytes = New-Object byte[] $count
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return $bytes
}

if (-not $Password) {
  $secure = Read-Host -Prompt 'New cockpit password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not $Password) {
  throw 'Password cannot be empty.'
}

$saltBytes = New-RandomBytes 16
$salt = New-Base64Url $saltBytes
$saltForHash = [Text.Encoding]::UTF8.GetBytes($salt)
$kdf = [Security.Cryptography.Rfc2898DeriveBytes]::new($Password, $saltForHash, $iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
$hash = New-Base64Url ($kdf.GetBytes(32))
$passwordHash = "pbkdf2_sha256:${iterations}:${salt}:${hash}"

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$config | Add-Member -NotePropertyName sitePasswordHash -NotePropertyValue $passwordHash -Force
if ($config.PSObject.Properties.Name -contains 'sitePassword') {
  $config.PSObject.Properties.Remove('sitePassword')
}
if (-not $config.sessionSecret) {
  $secretBytes = New-RandomBytes 32
  $config | Add-Member -NotePropertyName sessionSecret -NotePropertyValue (New-Base64Url $secretBytes) -Force
}
if ($null -eq $config.cookieSecure) {
  $config | Add-Member -NotePropertyName cookieSecure -NotePropertyValue $false -Force
}

$config | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 -Path $ConfigPath
Write-Host 'Cockpit password updated. Restart the service to apply it.'
