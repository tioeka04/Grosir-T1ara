# Mengambil produk aktif dari TikTok Shop, menggabungkannya dengan tiktok\harga.csv,
# lalu menulis js\produk-tiktok.js. Kalau gagal, data lama di website tidak disentuh.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

$FileCsv = Join-Path $PSScriptRoot 'harga.csv'
$FileData = Join-Path (Split-Path -Parent $PSScriptRoot) 'js\produk-tiktok.js'
if (-not $IsWindows -and $PSVersionTable.PSVersion.Major -ge 6) { $FileData = Join-Path (Split-Path -Parent $PSScriptRoot) 'js/produk-tiktok.js' }
$KolomCsv = 'id', 'nama', 'pasar', 'grosir', 'ecer', 'kategori', 'bahan', 'unggulan'
$Utf8Bom = New-Object Text.UTF8Encoding($true)
$Utf8 = New-Object Text.UTF8Encoding($false)

function Get-Angka($nilai) {
  $d = ([string]$nilai) -replace '[^\d]', ''
  if ($d) { return [long]$d }
  return $null
}

function Get-Rupiah($nilai) {
  if ($null -eq $nilai -or "$nilai" -eq '') { return $null }
  return [long][Math]::Round([double]::Parse([string]$nilai, [Globalization.CultureInfo]::InvariantCulture))
}

function Get-TeksBersih([string]$html) {
  $t = $html -replace '<[^>]+>', ' '
  $t = ([Net.WebUtility]::HtmlDecode($t) -replace '\s+', ' ').Trim()
  if ($t.Length -gt 400) { $t = $t.Substring(0, 400).Trim() + '...' }
  return $t
}

function Get-KategoriDariNama([string]$nama) {
  $n = $nama.ToLower()
  if ($n -match 'kebaya|kutubaru') { return 'kebaya' }
  if ($n -match 'gamis|abaya|maxi|long dress') { return 'gamis' }
  if ($n -match 'tunik|tunic') { return 'tunik' }
  if ($n -match 'atasan|blouse|blus|kemeja') { return 'atasan' }
  return 'lainnya'
}

function Get-Unik($daftar) {
  $hasil = New-Object Collections.ArrayList
  foreach ($x in $daftar) { if ($x -and -not $hasil.Contains($x)) { [void]$hasil.Add($x) } }
  return , [string[]]$hasil.ToArray([string])
}

# ---------- Kredensial ----------
$appKey = $env:TTS_APP_KEY
$appSecret = $env:TTS_APP_SECRET
$refresh = $env:TTS_REFRESH_TOKEN
$dariFile = $false
if (-not $appKey) {
  if (-not (Test-Path $Script:FileRahasia)) { throw 'Belum ada token. Jalankan tiktok\otorisasi.ps1 dulu (lihat PANDUAN-TIKTOK.md).' }
  $r = Get-Content $Script:FileRahasia -Raw | ConvertFrom-Json
  $appKey = $r.app_key; $appSecret = $r.app_secret; $refresh = $r.refresh_token
  $dariFile = $true
}

$t = Get-Token $appKey $appSecret 'refresh' $refresh
if ($t.refresh_token -and $t.refresh_token -ne $refresh) {
  if ($dariFile) {
    $json = @{ app_key = $appKey; app_secret = $appSecret; refresh_token = $t.refresh_token } | ConvertTo-Json
    [IO.File]::WriteAllText($Script:FileRahasia, $json)
  } elseif ($env:RUNNER_TEMP) {
    Write-Output "::add-mask::$($t.refresh_token)"
    [IO.File]::WriteAllText((Join-Path $env:RUNNER_TEMP 'tts_refresh'), $t.refresh_token)
  }
}
$sisaHari = [int](([DateTimeOffset]::FromUnixTimeSeconds([long]$t.refresh_token_expire_in) - [DateTimeOffset]::UtcNow).TotalDays)
if ($sisaHari -lt 30) { Write-Output "PERINGATAN: izin toko TikTok habis dalam $sisaHari hari. Ulangi otorisasi." }

$sesi = @{ app_key = $appKey; app_secret = $appSecret; access_token = $t.access_token; shop_cipher = '' }
$toko = @((Invoke-TikTok 'GET' '/authorization/202309/shops' -Sesi $sesi).shops)
if ($toko.Count -eq 0) { throw 'Akun ini belum memberi izin ke toko mana pun.' }
$sesi.shop_cipher = $toko[0].cipher
Write-Output "Toko: $($toko[0].name)"

# ---------- Daftar produk aktif ----------
$daftarId = New-Object Collections.ArrayList
$halaman = ''
do {
  $q = @{ page_size = 100 }
  if ($halaman) { $q.page_token = $halaman }
  $d = Invoke-TikTok 'POST' '/product/202502/products/search' $q '{"status":"ACTIVATE"}' $sesi
  foreach ($p in @($d.products)) { if ($p) { [void]$daftarId.Add([string]$p.id) } }
  $halaman = $d.next_page_token
} while ($halaman)
Write-Output "Produk aktif: $($daftarId.Count)"
if ($daftarId.Count -eq 0) { throw 'TikTok mengembalikan 0 produk aktif. Data website dibiarkan apa adanya.' }

# ---------- Harga manual ----------
$csv = @{}
$urutanCsv = New-Object Collections.ArrayList
if (Test-Path $FileCsv) {
  $baris = @(Get-Content $FileCsv -Encoding UTF8)
  if ($baris.Count -gt 1) {
    $pemisah = if ($baris[0] -match ';') { ';' } else { ',' }
    foreach ($row in ($baris | ConvertFrom-Csv -Delimiter $pemisah)) {
      if ($row.id) { $csv[$row.id] = $row; [void]$urutanCsv.Add($row.id) }
    }
  }
}

# ---------- Detail tiap produk ----------
$produk = New-Object Collections.ArrayList
$baru = 0
$tanpaHarga = 0
foreach ($id in $daftarId) {
  $p = Invoke-TikTok 'GET' "/product/202309/products/$id" -Sesi $sesi
  Start-Sleep -Milliseconds 150

  $harga = @(); $warna = @(); $ukuran = @(); $stok = 0; $fotoWarna = @{}
  foreach ($s in @($p.skus)) {
    $h = Get-Rupiah $s.price.sale_price
    if ($null -eq $h) { $h = Get-Rupiah $s.price.tax_exclusive_price }
    if ($null -ne $h) { $harga += $h }
    foreach ($g in @($s.inventory)) { if ($g) { $stok += [int]$g.quantity } }
    foreach ($a in @($s.sales_attributes)) {
      if (-not $a) { continue }
      if ($a.name -match '(?i)warna|colou?r') {
        $warna += $a.value_name
        if ($a.sku_img.urls) { $fotoWarna[$a.value_name] = @($a.sku_img.urls)[0] }
      } elseif ($a.name -match '(?i)ukuran|size') {
        $ukuran += $a.value_name
      }
    }
  }
  if ($harga.Count -eq 0) { Write-Output "Dilewati, tidak ada harga: $id"; continue }

  $bahan = ''
  foreach ($a in @($p.product_attributes)) {
    if ($a -and $a.name -match '(?i)bahan|material') { $bahan = (@($a.values | ForEach-Object { $_.name }) -join ', '); break }
  }
  $foto = ''
  if ($p.main_images) { $foto = @(@($p.main_images)[0].urls)[0] }

  $kunci = "TT$id"
  if (-not $csv.ContainsKey($kunci)) {
    $csv[$kunci] = [pscustomobject]@{ id = $kunci; nama = $p.title; pasar = ''; grosir = ''; ecer = ''; kategori = ''; bahan = ''; unggulan = '' }
    [void]$urutanCsv.Add($kunci)
    $baru++
  }
  $m = $csv[$kunci]
  $pasar = Get-Angka $m.pasar
  $grosir = Get-Angka $m.grosir
  if ($null -eq $pasar -or $null -eq $grosir) { $tanpaHarga++ }
  $ecer = Get-Angka $m.ecer
  if ($null -eq $ecer) { $ecer = ($harga | Measure-Object -Minimum).Minimum }

  [void]$produk.Add([ordered]@{
      id        = [string]$id
      nama      = [string]$p.title
      kategori  = $(if ($m.kategori) { $m.kategori.Trim().ToLower() } else { Get-KategoriDariNama $p.title })
      bahan     = $(if ($m.bahan) { $m.bahan.Trim() } else { $bahan })
      pasar     = $pasar
      ecer      = [long]$ecer
      grosir    = $grosir
      warna     = (Get-Unik $warna)
      ukuran    = (Get-Unik $ukuran)
      foto      = [string]$foto
      fotoWarna = $fotoWarna
      deskripsi = (Get-TeksBersih $p.description)
      stok      = $stok
      unggulan  = ($m.unggulan -match '(?i)^\s*(ya|y|yes|1)\s*$')
    })
}
if ($produk.Count -eq 0) { throw 'Tidak ada produk yang bisa dipakai. Data website dibiarkan apa adanya.' }

# ---------- Tulis hasil ----------
$terurut = @($produk | Sort-Object { $_.id })
$jsonProduk = ConvertTo-Json -InputObject $terurut -Depth 6 -Compress
$lama = if (Test-Path $FileData) { @(Get-Content $FileData -Encoding UTF8) } else { @() }
if ($lama.Count -ge 2 -and $lama[1] -ceq $jsonProduk) {
  Write-Output 'Tidak ada perubahan produk.'
} else {
  $waktu = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
  $isi = "window.TIARA_SYNC = { diperbarui: `"$waktu`", produk:`n$jsonProduk`n};`n"
  [IO.File]::WriteAllText($FileData, $isi, $Utf8)
  Write-Output "Website diperbarui: $($produk.Count) produk."
}

if ($baru -gt 0) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append(($KolomCsv -join ';') + "`r`n")
  foreach ($k in $urutanCsv) {
    $r = $csv[$k]
    $sel = $KolomCsv | ForEach-Object {
      $v = [string]$r.$_
      if ($v -match '[;"\r\n]') { '"' + ($v -replace '"', '""') + '"' } else { $v }
    }
    [void]$sb.Append(($sel -join ';') + "`r`n")
  }
  [IO.File]::WriteAllText($FileCsv, $sb.ToString(), $Utf8Bom)
  Write-Output "$baru produk baru ditambahkan ke tiktok\harga.csv."
}
if ($tanpaHarga -gt 0) { Write-Output "Catatan: $tanpaHarga produk belum punya harga pasaran atau grosir di harga.csv." }
