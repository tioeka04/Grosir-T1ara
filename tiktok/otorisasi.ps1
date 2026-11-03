# Sekali jalan: menukar kode izin toko dengan token, lalu menyimpannya di tiktok\.rahasia.json.
# Langkah lengkapnya ada di PANDUAN-TIKTOK.md.
param(
  [Parameter(Mandatory = $true)][string]$AppKey,
  [Parameter(Mandatory = $true)][string]$AppSecret,
  [Parameter(Mandatory = $true)][string]$AuthCode
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

$t = Get-Token $AppKey $AppSecret 'code' $AuthCode
@{ app_key = $AppKey; app_secret = $AppSecret; refresh_token = $t.refresh_token } |
  ConvertTo-Json | ForEach-Object { [IO.File]::WriteAllText($Script:FileRahasia, $_) }

$sampai = [DateTimeOffset]::FromUnixTimeSeconds([long]$t.refresh_token_expire_in).ToString('d MMM yyyy')
Write-Output "Berhasil. Toko: $($t.seller_name). Izin berlaku sampai $sampai."
Write-Output "Token tersimpan di $Script:FileRahasia"
