# Fungsi bersama untuk memanggil API TikTok Shop.
# Dokumentasi: partner.tiktokshop.com/docv2/page/sign-your-api-request
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Script:ApiHost = if ($env:TTS_API_HOST) { $env:TTS_API_HOST } else { 'https://open-api.tiktokglobalshop.com' }
$Script:AuthHost = if ($env:TTS_AUTH_HOST) { $env:TTS_AUTH_HOST } else { 'https://auth.tiktok-shops.com' }
$Script:FileRahasia = Join-Path $PSScriptRoot '.rahasia.json'

# Pesan error tidak pernah memuat URL, karena URL token berisi app_secret.
function Invoke-Http([string]$Method, [string]$Url, [hashtable]$Headers = @{}, [string]$Body = '') {
  $percobaan = 0
  while ($true) {
    $percobaan++
    $status = 0
    $teks = ''
    try {
      $req = [Net.HttpWebRequest]::Create($Url)
      $req.Method = $Method
      $req.Timeout = 60000
      $req.ContentType = 'application/json'
      foreach ($k in $Headers.Keys) { $req.Headers.Add($k, $Headers[$k]) }
      if ($Method -ne 'GET') {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Body)
        $req.ContentLength = $bytes.Length
        $s = $req.GetRequestStream()
        $s.Write($bytes, 0, $bytes.Length)
        $s.Close()
      }
      $res = $req.GetResponse()
    } catch [Net.WebException] {
      $res = $_.Exception.Response
    }
    if ($res) {
      $status = [int]$res.StatusCode
      $r = New-Object IO.StreamReader($res.GetResponseStream(), [Text.Encoding]::UTF8)
      $teks = $r.ReadToEnd()
      $r.Close()
      $res.Close()
    }
    if ($status -ge 200 -and $status -lt 429) { return $teks }
    if ($percobaan -ge 3) { throw "Permintaan ke TikTok gagal (HTTP $status) setelah $percobaan percobaan." }
    Start-Sleep -Seconds ($percobaan * 3)
  }
}

function Get-Tanda([string]$Path, [hashtable]$Query, [string]$Body, [string]$Secret) {
  [string[]]$kunci = $Query.Keys | Where-Object { $_ -ne 'sign' -and $_ -ne 'access_token' }
  [Array]::Sort($kunci, [StringComparer]::Ordinal)
  $isi = $Path
  foreach ($k in $kunci) { $isi += $k + $Query[$k] }
  $isi += $Body
  $hmac = New-Object Security.Cryptography.HMACSHA256 (, [Text.Encoding]::UTF8.GetBytes($Secret))
  $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Secret + $isi + $Secret))
  return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Invoke-TikTok([string]$Method, [string]$Path, [hashtable]$Query = @{}, [string]$Body = '', [hashtable]$Sesi) {
  $q = @{}
  foreach ($k in $Query.Keys) { $q[$k] = [string]$Query[$k] }
  $q['app_key'] = $Sesi.app_key
  $q['timestamp'] = [string][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  if ($Sesi.shop_cipher) { $q['shop_cipher'] = $Sesi.shop_cipher }
  $q['sign'] = Get-Tanda $Path $q $Body $Sesi.app_secret
  $qs = ($q.Keys | ForEach-Object { $_ + '=' + [Uri]::EscapeDataString($q[$_]) }) -join '&'
  $teks = Invoke-Http $Method ($Script:ApiHost + $Path + '?' + $qs) @{ 'x-tts-access-token' = $Sesi.access_token } $Body
  $json = $teks | ConvertFrom-Json
  if ($json.code -ne 0) { throw "TikTok menolak $Path : kode $($json.code), $($json.message) (request_id $($json.request_id))" }
  return $json.data
}

function Get-Token([string]$AppKey, [string]$AppSecret, [string]$Jenis, [string]$Nilai) {
  $e = { param($x) [Uri]::EscapeDataString($x) }
  if ($Jenis -eq 'code') {
    $url = "$Script:AuthHost/api/v2/token/get?app_key=$(& $e $AppKey)&app_secret=$(& $e $AppSecret)&auth_code=$(& $e $Nilai)&grant_type=authorized_code"
  } else {
    $url = "$Script:AuthHost/api/v2/token/refresh?app_key=$(& $e $AppKey)&app_secret=$(& $e $AppSecret)&refresh_token=$(& $e $Nilai)&grant_type=refresh_token"
  }
  $json = (Invoke-Http 'GET' $url) | ConvertFrom-Json
  if ($json.code -ne 0) { throw "Gagal mengambil token TikTok: kode $($json.code), $($json.message). Kalau izin toko sudah kedaluwarsa, ulangi otorisasi." }
  return $json.data
}
