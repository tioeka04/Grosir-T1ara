/* =====================================================================
   NILAI BAWAAN GROSIR TIARA.
   Toko, kategori, harga, dan produk sekarang diatur lewat admin.html
   (tersimpan di js/pengaturan.js), yang menimpa nilai di file ini.
   File ini tetap dipakai untuk produk contoh dan cadangan.

   Sebelum online:
   1. Isi toko.whatsapp (format 628xxx) dan toko.tiktok.
   2. Ganti produk contoh dengan produk asli.
   3. Ubah modeContoh menjadi false supaya catatan "data contoh" hilang.

   Kategori baru: tambah di daftar kategori, lalu pakai id-nya di produk.
   Samakan kategori dengan nama etalase di TikTok Shop supaya isinya sama.

   Setelah sync TikTok aktif, daftar produk di bawah otomatis diganti
   dengan js/produk-tiktok.js. Harga pasaran dan grosir diisi di
   tiktok/harga.csv. Lihat PANDUAN-TIKTOK.md.
   ===================================================================== */
window.TIARA = {
  modeContoh: true,

  toko: {
    nama: "Grosir Tiara",
    // Nomor admin, format 62xxx. Tiap pengunjung otomatis diarahkan ke salah satu admin.
    whatsapp: ["6282312386138", "6281224672430"],
    tiktok: "https://www.tiktok.com/@tiarafashion31",
    linkProdukTiktok: "https://www.tiktok.com/view/product/{id}", // link tiap produk hasil sync
    instagram: "",
    email: "",
    alamat: "",
    jamBuka: ""
  },

  // Harga grosir berlaku otomatis mulai jumlah ini (total semua model).
  minGrosir: 6,

  // Produk tanpa harga pasaran diberi harga pasaran = harga eceran + persen ini,
  // dibulatkan ke atas per Rp1.000. Isi 0 untuk mematikan.
  naikHargaPasar: 60,

  // Tampil di beranda hanya kalau sudah diisi. Contoh:
  // { nama: "Bu Rina", kota: "Bandung", isi: "Barangnya sama, harganya jauh lebih murah." }
  testimoni: [],

  kategori: [
    { id: "gamis", nama: "Gamis", deskripsi: "Dari model harian sampai pesta", art: "gamis", warna: "bata", motif: "plisket" },
    { id: "kebaya", nama: "Atasan Kebaya", deskripsi: "Brokat dan renda siap pakai", art: "kebaya", warna: "marun", motif: "renda" },
    { id: "tunik", nama: "Tunik", deskripsi: "Panjang pas, nyaman seharian", art: "tunik", warna: "salem", motif: "titik" },
    { id: "atasan", nama: "Atasan Pendek", deskripsi: "Ringan untuk kerja dan santai", art: "atasan", warna: "abu", motif: "polos" }
    // Kategori baru cukup ditambah di sini, otomatis muncul di website.
  ],

  /* Isi tiap produk:
     pasar  = harga pasaran untuk model dan bahan yang sama
     ecer   = harga beli satuan di Tiara
     grosir = harga per pcs saat total pesanan mencapai minGrosir
     warna  = pilih dari: marun, bata, salem, abu (untuk ilustrasi), atau nama bebas kalau sudah pakai foto
     foto   = alamat foto, misal "img/gamis-zahra.jpg". Kosong = pakai ilustrasi
     tiktok = link produk yang sama di TikTok Shop
     unggulan = true untuk tampil di beranda */
  produk: [
    { id: "gamis-zahra", nama: "Gamis Plisket Zahra", kategori: "gamis", bahan: "Ceruty Babydoll", motif: "plisket", pasar: 250000, ecer: 120000, grosir: 110000, warna: ["bata", "marun", "salem", "abu"], ukuran: ["M", "L", "XL", "XXL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Rok plisket jatuh dengan furing penuh dan kancing depan yang ramah busui." },
    { id: "gamis-alesha", nama: "Gamis Bordir Alesha", kategori: "gamis", bahan: "Moscrepe", motif: "bordir", pasar: 280000, ecer: 135000, grosir: 125000, warna: ["marun", "bata", "abu"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Aksen bordir di bagian bawah untuk acara keluarga dan pengajian." },
    { id: "gamis-naura", nama: "Gamis Harian Naura", kategori: "gamis", bahan: "Wolfis", motif: "polos", pasar: 190000, ecer: 89000, grosir: 79000, warna: ["salem", "abu", "marun"], ukuran: ["L", "XL", "XXL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Potongan A-line sederhana yang ringan dan tidak mudah kusut." },
    { id: "gamis-salwa", nama: "Gamis Titik Salwa", kategori: "gamis", bahan: "Crinkle Airflow", motif: "titik", pasar: 220000, ecer: 105000, grosir: 95000, warna: ["abu", "bata", "salem"], ukuran: ["M", "L", "XL", "XXL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Motif titik halus di bahan crinkle yang adem untuk dipakai seharian." },
    { id: "gamis-khadijah", nama: "Gamis Pesta Khadijah", kategori: "gamis", bahan: "Satin Silk", motif: "bordir", pasar: 320000, ecer: 155000, grosir: 145000, warna: ["marun", "salem"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Satin berkilau lembut dengan aksen bordir untuk acara resmi." },

    { id: "kebaya-ayu", nama: "Atasan Kebaya Brokat Ayu", kategori: "kebaya", bahan: "Brokat Tile", motif: "renda", pasar: 210000, ecer: 99000, grosir: 89000, warna: ["marun", "bata", "abu"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Brokat tile dengan tepi renda, tinggal padukan dengan rok atau kain." },
    { id: "kebaya-laras", nama: "Atasan Kebaya Kutubaru Laras", kategori: "kebaya", bahan: "Katun Paris", motif: "polos", pasar: 180000, ecer: 85000, grosir: 75000, warna: ["salem", "marun", "bata"], ukuran: ["S", "M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Model kutubaru yang rapi untuk kerja, wisuda, dan acara keluarga." },
    { id: "kebaya-sekar", nama: "Atasan Kebaya Renda Sekar", kategori: "kebaya", bahan: "Brokat Corded", motif: "renda", pasar: 240000, ecer: 115000, grosir: 105000, warna: ["bata", "abu"], ukuran: ["M", "L", "XL", "XXL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Renda corded bertekstur yang terlihat mewah di foto maupun aslinya." },

    { id: "tunik-hana", nama: "Tunik Kancing Hana", kategori: "tunik", bahan: "Linen Rami", motif: "polos", pasar: 165000, ecer: 79000, grosir: 69000, warna: ["abu", "salem", "marun"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Linen ringan dengan kancing depan dan belahan samping." },
    { id: "tunik-mira", nama: "Tunik Titik Mira", kategori: "tunik", bahan: "Katun Rayon", motif: "titik", pasar: 145000, ecer: 69000, grosir: 59000, warna: ["salem", "bata", "abu"], ukuran: ["M", "L", "XL", "XXL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Rayon adem bermotif titik, nyaman untuk aktivitas harian." },
    { id: "tunik-rania", nama: "Tunik Plisket Rania", kategori: "tunik", bahan: "Ceruty Babydoll", motif: "plisket", pasar: 175000, ecer: 85000, grosir: 75000, warna: ["bata", "marun"], ukuran: ["L", "XL", "XXL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Plisket di bagian depan membuat siluet terlihat lebih ramping." },
    { id: "tunik-dinda", nama: "Tunik Bordir Dinda", kategori: "tunik", bahan: "Moscrepe", motif: "bordir", pasar: 185000, ecer: 89000, grosir: 79000, warna: ["marun", "abu", "salem"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Bordir di tepi bawah untuk tampilan rapi tanpa ribet." },

    { id: "atasan-kirana", nama: "Atasan Pendek Kirana", kategori: "atasan", bahan: "Katun Rayon", motif: "polos", pasar: 115000, ecer: 55000, grosir: 49000, warna: ["abu", "marun", "salem", "bata"], ukuran: ["S", "M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Atasan basic yang gampang dipadukan dengan rok maupun celana." },
    { id: "atasan-sasha", nama: "Atasan Titik Sasha", kategori: "atasan", bahan: "Crinkle Airflow", motif: "titik", pasar: 125000, ecer: 59000, grosir: 52000, warna: ["salem", "abu"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: true, deskripsi: "Bahan crinkle tidak perlu disetrika, praktis untuk sehari-hari." },
    { id: "atasan-nadia", nama: "Atasan Plisket Nadia", kategori: "atasan", bahan: "Ceruty Babydoll", motif: "plisket", pasar: 135000, ecer: 65000, grosir: 58000, warna: ["bata", "marun"], ukuran: ["M", "L", "XL"], foto: "", tiktok: "", unggulan: false, deskripsi: "Plisket halus di bagian depan untuk tampilan kerja yang rapi." },
    { id: "atasan-tiwi", nama: "Atasan Bordir Tiwi", kategori: "atasan", bahan: "Linen Rami", motif: "bordir", pasar: 145000, ecer: 69000, grosir: 62000, warna: ["marun", "abu"], ukuran: ["S", "M", "L"], foto: "", tiktok: "", unggulan: false, deskripsi: "Linen dengan bordir kecil di bagian bawah, simpel tapi berkarakter." }
  ]
};
