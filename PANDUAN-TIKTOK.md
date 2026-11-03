# Panduan Sync Otomatis TikTok Shop

Setelah terpasang, setiap 6 jam GitHub mengambil produk aktif dari TikTok Shop lalu memperbarui website. Gratis, tanpa server sendiri, dan laptop boleh mati.

**Yang ikut berubah otomatis:** nama, foto, harga eceran, warna, ukuran, deskripsi, stok, produk baru, dan produk yang dinonaktifkan.

**Yang diatur sendiri lewat halaman admin:** produk mana yang tampil, harga grosir, produk unggulan, kategori, dan isi website lainnya. Harga pasaran dihitung otomatis dari harga eceran.

> **Jangan pernah mengunggah `tiktok/.rahasia.json` ke GitHub**, dan jangan membagikan App Secret ke siapa pun. File itu baru muncul di langkah 3, jadi selesaikan langkah 1 dulu.

## 1. Pasang website di GitHub

1. Buat akun di github.com.
2. Buat repository baru dengan pilihan **Public**.
3. Pilih **uploading an existing file**, lalu seret semua isi folder ini kecuali folder `.claude`.
4. Pastikan folder `.github` ikut terunggah. Tanpa folder itu sync tidak akan jalan.
5. Buka **Settings > Pages**, lalu pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.

Alamat website akan muncul di halaman Pages. Nanti alamat ini bisa diganti dengan domain sendiri.

## 2. Daftarkan aplikasi di TikTok Shop

1. Buka [Partner Center](https://partner.tiktokshop.com), lalu klik **Sign Up**.
2. Pilih jenis partner **Seller Developer**, yaitu pilihan untuk menghubungkan toko sendiri.
3. Lengkapi email, nomor telepon, dan verifikasi usaha sampai akun disetujui.
4. Di dashboard, buka **App Management > Create App**, lalu pilih **Custom App** (bukan Public App).
5. Isi datanya:
   - **App Name:** misalnya `Katalog Otomatis Grosir Tiara`.
   - **Redirect URL:** alamat website dari langkah 1. Website tidak perlu diubah, karena kode izin cukup disalin dari alamat browser di langkah 3.
   - **Description:** misalnya "Sinkronisasi katalog produk untuk website toko sendiri."
6. Centang izin **Product** (minimal Product Basic, `seller.product.basic`) dan **Authorization**, lalu klik **Submit**.
7. Setelah disetujui, catat **App Key**, **App Secret**, dan **Service ID** dari halaman detail aplikasi.

## 3. Beri izin ke toko

1. Masuk dengan akun seller, lalu buka alamat ini dengan Service ID milikmu:

   `https://services.tiktokshop.com/open/authorize?service_id=SERVICE_ID`

2. Setujui izinnya. Browser akan pindah ke website dengan alamat berisi `?code=...`.
3. Salin nilai `code` itu. Kode hanya berlaku 30 menit dan hanya bisa dipakai sekali.
4. Buka PowerShell di folder project ini, lalu jalankan:

   ```powershell
   powershell -ExecutionPolicy Bypass -File tiktok\otorisasi.ps1 -AppKey "APP_KEY" -AppSecret "APP_SECRET" -AuthCode "KODE"
   ```

5. Coba sync sekali dari laptop:

   ```powershell
   powershell -ExecutionPolicy Bypass -File tiktok\sync.ps1
   ```

Kalau berhasil, muncul tulisan `Website diperbarui: N produk`. Periksa `js/produk-tiktok.js`, terutama apakah nama, harga, warna, dan ukuran sudah benar.

## 4. Pasang kunci di GitHub

1. Buat token di **Settings akun > Developer settings > Fine-grained tokens**. Pilih hanya repository ini, lalu beri izin **Contents: Read and write** dan **Secrets: Read and write**.
2. Buka **Settings repository > Secrets and variables > Actions**, lalu tambahkan empat secret ini:

| Nama | Isi |
|---|---|
| `TTS_APP_KEY` | App Key |
| `TTS_APP_SECRET` | App Secret |
| `TTS_REFRESH_TOKEN` | nilai `refresh_token` di `tiktok/.rahasia.json` |
| `GH_PAT` | token GitHub dari poin 1 |

3. Buka tab **Actions**, pilih **Sync produk TikTok**, lalu tekan **Run workflow**.

Kalau hasilnya centang hijau, sync sudah aktif dan produk TikTok langsung tampil di website.

## 5. Mengatur produk lewat halaman admin

Buka `admin.html` di alamat website, misalnya `https://tioeka04.github.io/Grosir-T1ara/admin.html`.

**Masuk pertama kali.** Halaman admin memakai kunci akses GitHub, bukan password biasa.

1. Buka [pembuatan token GitHub](https://github.com/settings/personal-access-tokens/new).
2. Di **Repository access**, pilih **Only select repositories**, lalu pilih repository website ini.
3. Di **Permissions**, beri **Contents: Read and write** dan **Actions: Read and write**.
4. Klik **Generate token**, salin, lalu tempel di halaman admin.

Kunci hanya tersimpan di browser perangkat itu. Hapus centang **Ingat di perangkat ini** kalau memakai komputer orang lain, dan tekan **Keluar** setelah selesai.

**Yang bisa diatur:**

| Menu | Isi |
|---|---|
| Produk | Pilih produk yang tampil, jadikan unggulan di beranda, isi harga grosir, ganti harga, kategori, bahan, atau foto. Bisa juga menambah produk yang tidak ada di TikTok |
| Kategori | Ganti nama, urutan, ilustrasi, dan warna kategori, atau tambah kategori baru |
| Toko | Pengumuman di bagian atas website, nomor WhatsApp admin, minimal grosir, persen harga pasaran otomatis, dan kontak |
| Testimoni | Tambah atau hapus testimoni pelanggan |
| Sinkron TikTok | Lihat kapan terakhir sync, riwayatnya, dan jalankan sync saat itu juga |

Setiap perubahan baru tampil di website setelah tombol **Simpan & terbitkan** ditekan, lalu tunggu 1-2 menit. Data dari TikTok tidak pernah ditimpa. Yang disimpan hanya pilihanmu, jadi kolom yang dikosongkan kembali memakai data TikTok.

## Kalau ada masalah

Kalau sync gagal, website tetap memakai data terakhir dan GitHub mengirim email.

| Tanda | Penyebab | Yang dilakukan |
|---|---|---|
| Gagal mengambil token | Izin toko habis atau dicabut | Ulangi langkah 3, lalu ganti `TTS_REFRESH_TOKEN` |
| Gagal di langkah "Simpan token" atau checkout | Token `GH_PAT` kedaluwarsa | Buat token baru, lalu ganti `GH_PAT` |
| TikTok menolak, kode izin atau scope | Izin Product Basic belum aktif | Periksa aplikasi di Partner Center |
| Sync berhenti tanpa error | GitHub mematikan jadwal setelah 60 hari repository tidak ada aktivitas | Tab Actions, lalu aktifkan lagi |
| Link "Lihat di TikTok Shop" salah | Format link berbeda | Ubah `linkProdukTiktok` di `js/data.js` |
| Halaman admin menolak kunci | Kunci kedaluwarsa atau izinnya kurang | Buat kunci baru dengan izin Contents dan Actions |
| Simpan gagal, "diubah dari perangkat lain" | Ada yang menyimpan dari perangkat lain | Muat ulang halaman admin, lalu ulangi perubahan |

Selain terjadwal, sync bisa dijalankan kapan saja lewat tombol **Sinkronkan sekarang** di halaman admin.
