(function () {
  "use strict";

  var D = window.TIARA;
  var ATUR = window.TIARA_ATUR || {};
  var SYNC = window.TIARA_SYNC;

  /* Pengaturan dari halaman admin (js/pengaturan.js) menimpa nilai bawaan di data.js */
  ["minGrosir", "naikHargaPasar", "modeContoh", "pengumuman"].forEach(function (k) {
    if (ATUR[k] !== undefined) D[k] = ATUR[k];
  });
  if (ATUR.toko) Object.keys(ATUR.toko).forEach(function (k) { D.toko[k] = ATUR.toko[k]; });
  if (ATUR.kategori && ATUR.kategori.length) D.kategori = ATUR.kategori;
  if (ATUR.testimoni) D.testimoni = ATUR.testimoni;

  /* Produk: hasil sync TikTok (atau contoh), ditambah produk manual, lalu diubah sesuai admin */
  if (SYNC && SYNC.produk && SYNC.produk.length) {
    D.produk = SYNC.produk;
    D.modeContoh = false;
    D.produk.forEach(function (p) {
      if (!p.tiktok && D.toko.linkProdukTiktok) p.tiktok = D.toko.linkProdukTiktok.replace("{id}", p.id);
    });
  } else if (!D.modeContoh) {
    D.produk = [];
  }
  D.produk = D.produk.concat(ATUR.produkManual || []);
  var UBAH = ATUR.produk || {};
  D.produk = D.produk.map(function (p) {
    var u = UBAH[p.id];
    if (!u) return p;
    var q = Object.assign({}, p);
    Object.keys(u).forEach(function (k) {
      if (u[k] !== null && u[k] !== "") q[k] = u[k];
    });
    return q;
  }).filter(function (p) { return p.tampil !== false; });

  if (D.produk.some(function (p) { return !D.kategori.some(function (k) { return k.id === p.kategori; }); })) {
    D.kategori = D.kategori.concat({ id: "lainnya", nama: "Lainnya", deskripsi: "Produk pilihan lainnya", art: "tunik", warna: "abu", motif: "polos" });
    D.produk.forEach(function (p) {
      if (!D.kategori.some(function (k) { return k.id === p.kategori; })) p.kategori = "lainnya";
    });
  }
  D.kategori = D.kategori.filter(function (k) {
    return D.produk.some(function (p) { return p.kategori === k.id; });
  });

  if (D.naikHargaPasar > 0) {
    D.produk.forEach(function (p) {
      if (!p.pasar && p.ecer) p.pasar = Math.ceil(p.ecer * (1 + D.naikHargaPasar / 100) / 1000) * 1000;
    });
  }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var persen = function (p) { return p.pasar > p.ecer ? Math.round((1 - p.ecer / p.pasar) * 100) : 0; };
  var punyaHarga = function (p) { return p.pasar > p.ecer && p.grosir > 0; };
  var hargaTerendah = function (p) { return p.grosir || p.ecer; };
  var habis = function (p) { return p.stok === 0; };
  var varian = function (w, u) {
    return [w, u && "ukuran " + u].filter(Boolean).join(", ");
  };
  var produkById = function (id) { return D.produk.find(function (p) { return p.id === id; }); };

  /* ---------- Ilustrasi pakaian (dipakai selama belum ada foto asli) ---------- */

  var WARNA = {
    marun: { dasar: "#64242F", gelap: "#4E1A24", aksen: "#FC8F8F", latar: "#FC8F8F", gantungan: "#64242F" },
    bata: { dasar: "#B44446", gelap: "#8F3336", aksen: "#F4F1F0", latar: "#DFD9D8", gantungan: "#64242F" },
    salem: { dasar: "#FC8F8F", gelap: "#E57273", aksen: "#64242F", latar: "#64242F", gantungan: "#DFD9D8" },
    abu: { dasar: "#DFD9D8", gelap: "#C3B9B8", aksen: "#B44446", latar: "#B44446", gantungan: "#DFD9D8" }
  };
  var warnaDari = function (nama) { return WARNA[nama] || WARNA.bata; };

  var BENTUK = {
    gamis: {
      tinggi: 322,
      badan: "M92 44Q120 66 148 44L172 56L166 130L204 300Q120 316 36 300L74 130L68 56Z",
      lengan: "M68 56L46 68Q30 130 24 206Q35 212 47 208Q54 150 76 108Z",
      manset: "M24 206Q35 212 47 208L48 196Q36 200 25 194Z",
      pinggang: "M74 130Q120 140 166 130",
      kelim: "M43 280Q120 296 197 280",
      kancing: [78, 94, 110]
    },
    tunik: {
      tinggi: 252,
      badan: "M92 44Q120 66 148 44L172 56L168 130L180 226Q120 240 60 226L72 130L68 56Z",
      lengan: "M68 56L46 68Q30 130 24 206Q35 212 47 208Q54 150 74 106Z",
      manset: "M24 206Q35 212 47 208L48 196Q36 200 25 194Z",
      kelim: "M63 210Q120 224 177 210",
      kancing: [76, 96, 116, 136, 156],
      belahan: "M72 228L76 192M168 228L164 192"
    },
    kebaya: {
      tinggi: 232,
      badan: "M92 44L120 112L148 44L172 56L160 118L176 196Q146 214 124 192L120 150L116 192Q94 214 64 196L80 118L68 56Z",
      dalam: "M92 44Q120 58 148 44L120 112Z",
      lengan: "M68 56L48 68Q36 130 28 206Q38 212 49 208Q58 150 78 104Z",
      manset: "M28 206Q38 212 49 208L50 196Q39 200 29 194Z",
      renda: [[96, 54], [101, 66], [106, 78], [111, 90], [116, 102], [144, 54], [139, 66], [134, 78], [129, 90], [124, 102]]
    },
    atasan: {
      tinggi: 208,
      badan: "M90 44Q120 64 150 44L178 58L170 112L177 186Q120 200 63 186L70 112L62 58Z",
      lengan: "M62 58L28 86L44 124L70 104Z",
      manset: "M28 86L44 124L51 118L35 80Z",
      kelim: "M66 172Q120 184 174 172",
      kancing: []
    }
  };

  var nomorSvg = 0;
  function garmen(jenis, namaWarna, motif) {
    var b = BENTUK[jenis] || BENTUK.gamis;
    var w = warnaDari(namaWarna);
    var id = "g" + (++nomorSvg);
    var cermin = 'transform="translate(240 0) scale(-1 1)"';
    var lapisan = "";

    if (motif === "plisket") {
      for (var x = 46; x <= 194; x += 11) {
        lapisan += '<path d="M' + (120 + (x - 120) * 0.42) + ' 132L' + x + ' 310" stroke="' + w.gelap + '" stroke-width="1.6"/>';
      }
    } else if (motif === "titik") {
      lapisan = '<rect width="240" height="322" fill="url(#' + id + 'p)"/>';
    } else if (motif === "bordir") {
      var yBawah = b.tinggi - 62;
      for (var i = 0; i < 13; i++) {
        var bx = 30 + i * 15;
        lapisan += '<path d="M' + bx + ' ' + (yBawah + 14) + 'q7.500 -16 15 0" fill="none" stroke="' + w.aksen + '" stroke-width="1.8"/>' +
          '<circle cx="' + (bx + 7.5) + '" cy="' + (yBawah + 15) + '" r="2" fill="' + w.aksen + '"/>';
      }
    } else if (motif === "renda") {
      lapisan = '<rect width="240" height="322" fill="url(#' + id + 'r)"/>';
    }

    var kancing = (b.kancing || []).map(function (y) {
      return '<circle cx="120" cy="' + y + '" r="2.600" fill="' + w.aksen + '"/>';
    }).join("");
    var renda = (b.renda || []).map(function (t) {
      return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="5" fill="' + w.aksen + '"/>';
    }).join("");

    return '<svg viewBox="0 0 240 ' + b.tinggi + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      "<defs>" +
      '<clipPath id="' + id + 'c"><path d="' + b.badan + '"/></clipPath>' +
      '<pattern id="' + id + 'p" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="' + w.aksen + '"/><circle cx="14" cy="14" r="2" fill="' + w.aksen + '"/></pattern>' +
      '<pattern id="' + id + 'r" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 2l6 6-6 6-6-6z" fill="none" stroke="' + w.aksen + '" stroke-width="1" opacity=".55"/><circle cx="8" cy="8" r="1.300" fill="' + w.aksen + '" opacity=".7"/></pattern>' +
      "</defs>" +
      '<path d="M120 40V24c0-6 9-6 9-13a8 8 0 0 0-16-1" fill="none" stroke="' + w.gantungan + '" stroke-width="3.500" stroke-linecap="round"/>' +
      '<path d="M120 28L70 54M120 28l50 26" fill="none" stroke="' + w.gantungan + '" stroke-width="3.500" stroke-linecap="round"/>' +
      '<path d="' + b.lengan + '" fill="' + w.gelap + '"/><path d="' + b.lengan + '" fill="' + w.gelap + '" ' + cermin + "/>" +
      '<path d="' + b.badan + '" fill="' + w.dasar + '"/>' +
      (b.dalam ? '<path d="' + b.dalam + '" fill="' + w.aksen + '"/>' : '<path d="M92 44Q120 66 148 44Q120 54 92 44Z" fill="' + w.gelap + '"/>') +
      '<g clip-path="url(#' + id + 'c)">' + lapisan + "</g>" +
      '<path d="' + b.manset + '" fill="' + w.aksen + '"/><path d="' + b.manset + '" fill="' + w.aksen + '" ' + cermin + "/>" +
      (b.pinggang ? '<path d="' + b.pinggang + '" fill="none" stroke="' + w.gelap + '" stroke-width="2.500"/>' : "") +
      (b.kelim ? '<path d="' + b.kelim + '" fill="none" stroke="' + w.aksen + '" stroke-width="1.800" stroke-dasharray="5 4"/>' : "") +
      (b.belahan ? '<path d="' + b.belahan + '" stroke="' + w.gelap + '" stroke-width="2"/>' : "") +
      kancing + renda +
      "</svg>";
  }

  function artKategori(p) {
    var k = D.kategori.find(function (c) { return c.id === p.kategori; });
    return k ? k.art : "gamis";
  }
  function gambarProduk(p, warna) {
    var foto = (warna && p.fotoWarna && p.fotoWarna[warna]) || p.foto;
    if (foto) return '<img src="' + esc(foto) + '" alt="' + esc(p.nama) + '" loading="lazy" referrerpolicy="no-referrer">';
    return garmen(artKategori(p), warna || (p.warna || [])[0], p.motif);
  }
  function latarProduk(p, warna) {
    return p.foto ? "var(--abu-muda)" : warnaDari(warna || (p.warna || [])[0]).latar;
  }
  /* Foto yang gagal dimuat disembunyikan supaya tidak tampil ikon rusak */
  document.addEventListener("error", function (e) {
    if (e.target && e.target.tagName === "IMG") e.target.style.visibility = "hidden";
  }, true);

  /* ---------- WhatsApp dan TikTok ---------- */

  var NOMOR_WA = [].concat(D.toko.whatsapp || []).filter(Boolean);

  /* Pengunjung dibagi rata ke para admin, dan tetap ke admin yang sama di kunjungan berikutnya */
  var adminPengunjung = (function () {
    var i;
    try {
      var tersimpan = localStorage.getItem("tiara-admin");
      if (tersimpan !== null) i = Number(tersimpan);
    } catch (e) { /* tanpa penyimpanan */ }
    if (!(i >= 0 && i < NOMOR_WA.length)) {
      i = Math.floor(Math.random() * NOMOR_WA.length);
      try { localStorage.setItem("tiara-admin", i); } catch (e) { /* tanpa penyimpanan */ }
    }
    return i;
  })();

  function linkWa(pesan, admin) {
    var teks = encodeURIComponent(pesan);
    var nomor = NOMOR_WA[admin != null ? admin : adminPengunjung];
    return nomor
      ? "https://wa.me/" + nomor + "?text=" + teks
      : "https://wa.me/?text=" + teks;
  }
  var PESAN_UMUM = "Halo " + D.toko.nama + ", saya mau tanya produknya.";

  function ikatTautan() {
    $$("[data-wa]").forEach(function (a) {
      var admin = a.getAttribute("data-wa-admin");
      a.href = linkWa(a.getAttribute("data-wa-pesan") || PESAN_UMUM, admin === null ? null : Number(admin));
      a.target = "_blank";
      a.rel = "noopener";
    });
    $$("[data-tiktok]").forEach(function (a) {
      if (D.toko.tiktok) { a.href = D.toko.tiktok; a.target = "_blank"; a.rel = "noopener"; }
      else a.hidden = true;
    });
    $$("[data-min-grosir]").forEach(function (el) { el.textContent = D.minGrosir; });
  }

  /* ---------- Kerangka: header, footer, dialog ---------- */

  var IKON = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2zm5.800 14.200c-.2.700-1.400 1.300-2 1.400-.500.100-1.200.100-1.900-.100-.400-.100-1-.300-1.700-.700-3-1.300-5-4.300-5.100-4.500-.200-.200-1.200-1.600-1.200-3s.700-2.100 1-2.400c.300-.300.600-.400.800-.400h.600c.200 0 .400 0 .600.500l.800 2c.100.200.100.400 0 .500l-.300.500-.400.500c-.100.100-.300.300-.100.600.200.300.700 1.200 1.600 2 1.100 1 2 1.300 2.300 1.400.300.100.500.100.600-.100l.900-1c.200-.300.400-.200.600-.100l1.900.900c.300.100.500.200.500.300.100.100.100.700-.100 1.200z"/></svg>',
    rumah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
    katalog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7V5.500a1.800 1.800 0 1 1 1.800 1.800L12 8.500 3 15v3h18v-3z"/></svg>',
    daftar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/></svg>'
  };
  var LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#B44446"/><path d="M9 27 7.500 14l7 5.500L20 10l5.500 9.500 7-5.500L31 27z" fill="#fff"/><path d="M9 30.500h22" stroke="#FC8F8F" stroke-width="2.500" stroke-linecap="round"/></svg>';

  function bangunKerangka() {
    var hal = document.body.getAttribute("data-halaman");
    var di = hal === "beranda" ? "" : "index.html";
    var kini = function (h) { return hal === h ? ' aria-current="page"' : ""; };
    var t = D.toko;

    $("#kepala").innerHTML =
      (D.pengumuman ? '<p class="pengumuman">' + esc(D.pengumuman) + "</p>" : "") +
      (D.modeContoh ? '<p class="catatan-contoh">Tampilan contoh: foto, harga, dan produk belum final.</p>' : "") +
      '<header class="header"><div class="isi header-isi">' +
      '<a class="logo" href="index.html" aria-label="' + esc(t.nama) + ', ke beranda">' + LOGO +
      '<span class="logo-kata"><small>Grosir</small><b>Tiara</b></span></a>' +
      '<nav class="nav" aria-label="Utama">' +
      '<a href="katalog.html"' + kini("katalog") + ">Katalog</a>" +
      '<a href="' + di + '#selisih">Cek Selisih</a>' +
      '<a href="' + di + '#grosir">Grosir</a>' +
      '<a href="' + di + '#cara-pesan">Cara Pesan</a>' +
      '<a href="' + di + '#tentang">Tentang</a></nav>' +
      '<button class="btn btn-bata tombol-daftar" type="button" data-buka-daftar>Daftar pesanan <span class="jumlah" data-jumlah>0</span></button>' +
      "</div></header>";

    var kontak = [
      t.alamat && "<li>" + esc(t.alamat) + "</li>",
      t.jamBuka && "<li>" + esc(t.jamBuka) + "</li>",
      t.email && '<li><a href="mailto:' + esc(t.email) + '">' + esc(t.email) + "</a></li>",
      NOMOR_WA.length > 1
        ? NOMOR_WA.map(function (n, i) {
          return '<li><a data-wa data-wa-admin="' + i + '" href="#">WhatsApp Admin ' + (i + 1) + ": 0" + esc(n.slice(2)) + "</a></li>";
        }).join("")
        : '<li><a data-wa href="#">WhatsApp</a></li>',
      t.tiktok && '<li><a data-tiktok href="#">TikTok</a></li>',
      t.instagram && '<li><a href="' + esc(t.instagram) + '" target="_blank" rel="noopener">Instagram</a></li>'
    ].filter(Boolean).join("");

    $("#kaki").innerHTML =
      '<footer class="footer"><div class="isi"><div class="footer-grid">' +
      '<div><a class="logo" href="index.html" aria-label="' + esc(t.nama) + '">' + LOGO + '<span class="logo-kata"><small>Grosir</small><b>Tiara</b></span></a>' +
      '<p style="margin-top:14px;max-width:38ch">Gamis, atasan kebaya, tunik, dan atasan pendek siap jadi. Eceran bisa, grosir lebih murah.</p></div>' +
      "<div><h3>Kategori</h3><ul>" + D.kategori.map(function (k) {
        return '<li><a href="katalog.html?kategori=' + esc(k.id) + '">' + esc(k.nama) + "</a></li>";
      }).join("") + "</ul></div>" +
      "<div><h3>Hubungi kami</h3><ul>" + kontak + "</ul></div></div>" +
      '<div class="footer-bawah"><p>Harga pasaran adalah perkiraan harga produk dengan model dan bahan serupa di pasaran.</p>' +
      "<p>&copy; " + new Date().getFullYear() + " " + esc(t.nama) + "</p></div></div></footer>" +

      '<nav class="nav-bawah" aria-label="Navigasi ponsel">' +
      '<a href="index.html"' + kini("beranda") + ">" + IKON.rumah + "Beranda</a>" +
      '<a href="katalog.html"' + kini("katalog") + ">" + IKON.katalog + "Katalog</a>" +
      '<button type="button" data-buka-daftar>' + IKON.daftar + '<span class="jumlah" data-jumlah>0</span>Pesanan</button>' +
      '<a data-wa href="#">' + IKON.wa + "WhatsApp</a></nav>" +

      '<dialog class="dialog-produk" id="dialog-produk" aria-labelledby="judul-produk"></dialog>' +
      '<dialog class="dialog-daftar" id="dialog-daftar" aria-labelledby="judul-daftar"></dialog>' +
      '<div class="notif" id="notif" role="status"></div>';
  }

  /* ---------- Kartu produk ---------- */

  function kartu(p) {
    var lencana = habis(p) ? "Stok habis" : persen(p) ? "Hemat " + persen(p) + "%" : "";
    return '<article class="kartu">' +
      '<button class="kartu-gambar" type="button" data-buka="' + esc(p.id) + '" style="background:' + latarProduk(p) + '" aria-label="Lihat ' + esc(p.nama) + '">' +
      (lencana ? '<span class="potongan">' + lencana + "</span>" : "") + gambarProduk(p) + "</button>" +
      '<div class="kartu-teks"><span class="bahan">' + esc(p.bahan || "") + "</span>" +
      '<h3><button type="button" data-buka="' + esc(p.id) + '">' + esc(p.nama) + "</button></h3>" +
      (persen(p) ? '<span class="harga-pasar">Pasaran <span class="coret">' + rp(p.pasar) + "</span></span>" : "") +
      '<span class="harga-utama">' + rp(p.ecer) + "</span>" +
      (p.grosir ? '<span class="harga-grosir">Grosir ' + rp(p.grosir) + "</span>" : "") + "</div>" +
      '<div class="kartu-aksi"><button class="btn btn-garis" style="color:var(--bata)" type="button" data-buka="' + esc(p.id) + '">Pilih</button></div>' +
      "</article>";
  }

  /* ---------- Dialog detail produk ---------- */

  var pilihan = { id: null, warna: null, ukuran: null, jumlah: 1 };

  function hexWarna(nama) { return WARNA[nama] ? WARNA[nama].dasar : "#DFD9D8"; }

  function bukaProduk(id) {
    var p = produkById(id);
    if (!p) return;
    p.warna = p.warna || [];
    p.ukuran = p.ukuran || [];
    pilihan = { id: id, warna: p.warna[0] || "", ukuran: p.ukuran[0] || "", jumlah: 1 };
    var d = $("#dialog-produk");
    var hematPcs = p.pasar - p.ecer;
    var pakaiBulatan = p.warna.every(function (w) { return WARNA[w]; });
    d.innerHTML =
      '<button class="tutup" type="button" data-tutup aria-label="Tutup">&times;</button>' +
      '<div class="produk-grid">' +
      '<div class="produk-gambar" id="produk-gambar" style="background:' + latarProduk(p) + '">' + gambarProduk(p) + "</div>" +
      '<div class="produk-teks">' +
      (p.bahan ? '<p class="label" style="color:var(--bata)">' + esc(p.bahan) + "</p>" : "") +
      '<h2 id="judul-produk">' + esc(p.nama) + "</h2>" +
      (p.deskripsi ? "<p>" + esc(p.deskripsi) + "</p>" : "") +
      (persen(p) ? '<p class="hemat-baris">Pasaran <span class="coret">' + rp(p.pasar) + "</span> &nbsp;<mark>Hemat " + rp(hematPcs) + "</mark></p>" : "") +
      '<div class="harga-kotak"><div><small>Eceran</small><b>' + rp(p.ecer) + "</b></div>" +
      (p.grosir ? "<div><small>Grosir, mulai " + D.minGrosir + " pcs</small><b>" + rp(p.grosir) + "</b></div>" : "") + "</div>" +
      (p.warna.length ? '<fieldset><legend>Warna: <span id="nama-warna">' + esc(p.warna[0]) + '</span></legend><div class="opsi">' +
      p.warna.map(function (w, i) {
        return '<label><input type="radio" name="warna" value="' + esc(w) + '"' + (i === 0 ? " checked" : "") + ' aria-label="' + esc(w) + '">' +
          (pakaiBulatan
            ? '<span class="swatch" style="--warna:' + hexWarna(w) + ";background:" + hexWarna(w) + '"></span>'
            : "<span>" + esc(w) + "</span>") + "</label>";
      }).join("") + "</div></fieldset>" : "") +
      (p.ukuran.length ? '<fieldset><legend>Ukuran</legend><div class="opsi">' +
      p.ukuran.map(function (u, i) {
        return '<label><input type="radio" name="ukuran" value="' + esc(u) + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(u) + "</span></label>";
      }).join("") + "</div></fieldset>" : "") +
      (habis(p)
        ? '<p class="hemat-baris"><mark>Stok sedang habis</mark></p><a class="btn btn-bata" data-wa data-wa-pesan="' + esc("Halo " + D.toko.nama + ", kapan " + p.nama + " tersedia lagi?") + '" href="#">' + IKON.wa + "Tanya ketersediaan</a>"
        : '<fieldset><legend>Jumlah</legend><div class="stepper">' +
      '<button type="button" data-ubah="-1" aria-label="Kurangi">&minus;</button><output id="jumlah-pilih">1</output>' +
      '<button type="button" data-ubah="1" aria-label="Tambah">+</button></div></fieldset>' +
      '<div class="aksi-produk"><button class="btn btn-garis" style="color:var(--bata)" type="button" data-tambah>Tambah ke daftar</button>' +
      '<a class="btn btn-bata" id="pesan-langsung" target="_blank" rel="noopener" href="#">' + IKON.wa + "Pesan via WA</a></div>") +
      (p.tiktok ? '<a class="link-tiktok" href="' + esc(p.tiktok) + '" target="_blank" rel="noopener">Lihat produk ini di TikTok Shop</a>' : "") +
      "</div></div>";
    perbaruiPesanLangsung();
    ikatTautan();
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    history.replaceState(null, "", "#p=" + id);
  }

  function hargaPer(p, totalPcs) { return totalPcs >= D.minGrosir && p.grosir ? p.grosir : p.ecer; }

  function perbaruiPesanLangsung() {
    var p = produkById(pilihan.id);
    var a = $("#pesan-langsung");
    if (!p || !a) return;
    var h = hargaPer(p, pilihan.jumlah);
    a.href = linkWa(
      "Halo " + D.toko.nama + ", saya mau pesan:\n\n" +
      "*" + p.nama + "*" + (p.bahan ? "\nBahan: " + p.bahan : "") + (pilihan.warna ? "\nWarna: " + pilihan.warna : "") + (pilihan.ukuran ? "\nUkuran: " + pilihan.ukuran : "") +
      "\nJumlah: " + pilihan.jumlah + " pcs x " + rp(h) + "\nTotal: " + rp(h * pilihan.jumlah) +
      "\n\nApakah stoknya tersedia?"
    );
  }

  function pasangDialogProduk() {
    var d = $("#dialog-produk");
    d.addEventListener("change", function (e) {
      if (e.target.name === "warna") {
        pilihan.warna = e.target.value;
        $("#nama-warna").textContent = pilihan.warna;
        var p = produkById(pilihan.id);
        var g = $("#produk-gambar");
        g.style.background = latarProduk(p, pilihan.warna);
        g.innerHTML = gambarProduk(p, pilihan.warna);
      }
      if (e.target.name === "ukuran") pilihan.ukuran = e.target.value;
      perbaruiPesanLangsung();
    });
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
      var ubah = e.target.closest("[data-ubah]");
      if (ubah) {
        pilihan.jumlah = Math.max(1, Math.min(999, pilihan.jumlah + Number(ubah.getAttribute("data-ubah"))));
        $("#jumlah-pilih").textContent = pilihan.jumlah;
        perbaruiPesanLangsung();
      }
      if (e.target.closest("[data-tambah]")) {
        tambahKeDaftar(pilihan);
        d.close();
        notif(produkById(pilihan.id).nama + " masuk daftar");
      }
    });
    d.addEventListener("close", function () {
      if (location.hash.indexOf("#p=") === 0) history.replaceState(null, "", location.pathname + location.search);
    });
  }

  /* ---------- Daftar pesanan: banyak produk dalam satu pesan WhatsApp ---------- */

  var KUNCI = "tiara-daftar";
  var daftar = [];
  try {
    daftar = JSON.parse(localStorage.getItem(KUNCI)) || [];
    daftar = daftar.filter(function (b) { return produkById(b.id); });
  } catch (e) { daftar = []; }

  function simpan() {
    try { localStorage.setItem(KUNCI, JSON.stringify(daftar)); } catch (e) { /* tetap jalan tanpa penyimpanan */ }
    perbaruiJumlah();
  }
  function totalPcs() { return daftar.reduce(function (n, b) { return n + b.jumlah; }, 0); }
  function perbaruiJumlah() {
    $$("[data-jumlah]").forEach(function (el) { el.textContent = totalPcs(); });
  }
  function tambahKeDaftar(x) {
    var ada = daftar.find(function (b) { return b.id === x.id && b.warna === x.warna && b.ukuran === x.ukuran; });
    if (ada) ada.jumlah += x.jumlah;
    else daftar.push({ id: x.id, warna: x.warna, ukuran: x.ukuran, jumlah: x.jumlah });
    simpan();
  }

  function pesanDaftar() {
    var pcs = totalPcs();
    var total = 0;
    var baris = daftar.map(function (b, i) {
      var p = produkById(b.id);
      var h = hargaPer(p, pcs);
      total += h * b.jumlah;
      var v = varian(b.warna, b.ukuran);
      return (i + 1) + ". *" + p.nama + "*\n   " + (v ? v + "\n   " : "") + b.jumlah + " pcs x " + rp(h) + " = " + rp(h * b.jumlah);
    }).join("\n");
    return "Halo " + D.toko.nama + ", saya mau pesan (" + (pcs >= D.minGrosir ? "harga grosir" : "harga eceran") + "):\n\n" + baris +
      "\n\nTotal " + pcs + " pcs: *" + rp(total) + "* (belum termasuk ongkir)\n\nNama:\nAlamat kirim:\n";
  }

  function gambarDaftar() {
    var d = $("#dialog-daftar");
    var pcs = totalPcs();
    var kepala = '<div class="daftar-kepala"><button class="tutup" type="button" data-tutup aria-label="Tutup">&times;</button>' +
      '<h2 id="judul-daftar">Daftar pesanan</h2></div>';

    if (!daftar.length) {
      d.innerHTML = kepala + '<div class="daftar-isi"><div class="daftar-kosong"><p>Belum ada produk yang dipilih.</p>' +
        '<a class="btn btn-bata" href="katalog.html">Buka katalog</a></div></div>';
      return;
    }

    var total = 0;
    var isi = daftar.map(function (b, i) {
      var p = produkById(b.id);
      var h = hargaPer(p, pcs);
      total += h * b.jumlah;
      return '<div class="baris-pesanan"><div class="mini" style="background:' + latarProduk(p, b.warna) + '">' + gambarProduk(p, b.warna) + "</div><div>" +
        "<h3>" + esc(p.nama) + "</h3><p><span>" + esc([b.warna, b.ukuran].filter(Boolean).join(", ")) + "</span>" + (b.warna || b.ukuran ? " &middot; " : "") + rp(h) + "/pcs</p>" +
        '<div class="baris-bawah"><div class="stepper"><button type="button" data-baris="' + i + '" data-beda="-1" aria-label="Kurangi">&minus;</button><output>' + b.jumlah + "</output>" +
        '<button type="button" data-baris="' + i + '" data-beda="1" aria-label="Tambah">+</button></div><b>' + rp(h * b.jumlah) + "</b></div>" +
        '<button class="hapus" type="button" data-hapus="' + i + '">Hapus</button></div></div>';
    }).join("");

    var kurang = D.minGrosir - pcs;
    var skala = Math.min(100, pcs / D.minGrosir * 100);
    var progres = '<div class="progres"><span>' + (kurang > 0
      ? "Tambah " + kurang + " pcs lagi untuk harga grosir"
      : "Harga grosir sudah berlaku") + '</span><div class="bar"><i style="width:' + skala + '%"></i></div></div>';

    d.innerHTML = kepala + '<div class="daftar-isi">' + isi + "</div>" +
      '<div class="daftar-bawah">' + progres +
      '<div class="total"><span>Total ' + pcs + ' pcs</span><b>' + rp(total) + "</b></div>" +
      '<a class="btn btn-bata" target="_blank" rel="noopener" href="' + linkWa(pesanDaftar()) + '">' + IKON.wa + "Kirim pesanan ke WhatsApp</a></div>";
  }

  function pasangDaftar() {
    var d = $("#dialog-daftar");
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-buka-daftar]")) { gambarDaftar(); d.showModal(); }
      var buka = e.target.closest("[data-buka]");
      if (buka) bukaProduk(buka.getAttribute("data-buka"));
    });
    d.addEventListener("click", function (e) {
      if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
      var beda = e.target.closest("[data-beda]");
      var hapus = e.target.closest("[data-hapus]");
      if (beda) {
        var b = daftar[Number(beda.getAttribute("data-baris"))];
        b.jumlah = Math.max(1, b.jumlah + Number(beda.getAttribute("data-beda")));
      } else if (hapus) {
        daftar.splice(Number(hapus.getAttribute("data-hapus")), 1);
      } else return;
      simpan();
      gambarDaftar();
    });
  }

  var waktuNotif;
  function notif(teks) {
    var n = $("#notif");
    n.textContent = teks;
    n.classList.add("tampil");
    clearTimeout(waktuNotif);
    waktuNotif = setTimeout(function () { n.classList.remove("tampil"); }, 2200);
  }

  /* ---------- Beranda ---------- */

  function beranda() {
    var berharga = D.produk.filter(punyaHarga);
    var contoh = berharga[0];
    if (contoh) {
      $("#label-hero").innerHTML =
        '<span class="kecil">Harga pasaran</span><span class="pasar coret">' + rp(contoh.pasar) + "</span>" +
        '<span class="kecil" style="margin-top:6px">Di Tiara</span><span class="tiara">' + Math.round(contoh.grosir / 1000) + "&ndash;" + Math.round(contoh.ecer / 1000) + "rb</span>" +
        '<span class="kecil">' + esc(contoh.nama) + "</span>";
    } else {
      $("#label-hero").hidden = true;
    }

    var termurah = Math.min.apply(null, D.produk.map(hargaTerendah));
    var hematMaks = berharga.length ? Math.max.apply(null, berharga.map(function (p) { return Math.round((1 - p.grosir / p.pasar) * 100); })) : 0;
    $("#pita").innerHTML = [
      D.produk.length ? [rp(termurah), "harga mulai dari"] : ["Eceran", "dan grosir"],
      hematMaks ? [hematMaks + "%", "hemat hingga, dibanding pasaran"] : [D.produk.length + " produk", "siap dipesan sekarang"],
      ["1 pcs", "eceran boleh, tanpa minimal"],
      [D.minGrosir + " pcs", "sudah dapat harga grosir"]
    ].map(function (f) { return '<div class="fakta"><b>' + f[0] + "</b><span>" + f[1] + "</span></div>"; }).join("");

    /* Cek selisih: satu produk contoh untuk tiap kategori */
    var wakil = D.kategori.map(function (k) {
      return berharga.find(function (p) { return p.kategori === k.id; });
    }).filter(Boolean);
    var aktif = wakil[0];
    if (!aktif) $("#selisih").hidden = true;
    var qty = 12;

    $("#panel-selisih").innerHTML =
      '<div class="panel-judul"><h3 id="s-nama"></h3><span id="s-bahan"></span></div>' +
      '<div class="bar-baris"><div class="bar-info"><span>Harga pasaran</span><b id="s-pasar"></b></div><div class="bar"><i class="b-pasar" style="width:100%"></i></div></div>' +
      '<div class="bar-baris"><div class="bar-info"><span>Di Tiara</span><b id="s-tiara" style="color:var(--bata)"></b></div><div class="bar"><i class="b-tiara" id="s-bar"></i></div></div>' +
      '<div class="penggeser"><label for="geser-qty"><span>Jumlah beli</span><span id="s-qty"></span></label>' +
      '<input id="geser-qty" type="range" min="1" max="120" value="' + qty + '"></div>' +
      '<div class="hemat"><span>Kamu hemat</span><b id="s-hemat"></b></div>' +
      '<p class="catatan-kaki">Harga pasaran adalah perkiraan untuk model dan bahan serupa. Harga grosir berlaku mulai ' + D.minGrosir + " pcs.</p>";
    $("#geser-qty").addEventListener("input", function (e) {
      qty = Number(e.target.value);
      gambarPanel();
    });

    function gambarPanel() {
      var h = hargaPer(aktif, qty);
      var totalPasar = aktif.pasar * qty;
      var totalTiara = h * qty;
      $("#s-nama").textContent = aktif.nama;
      $("#s-bahan").textContent = aktif.bahan;
      $("#s-pasar").textContent = rp(totalPasar);
      $("#s-tiara").textContent = rp(totalTiara);
      $("#s-bar").style.width = (totalTiara / totalPasar * 100) + "%";
      $("#s-qty").textContent = qty + " pcs · " + rp(h) + "/pcs";
      $("#s-hemat").textContent = rp(totalPasar - totalTiara);
    }

    $("#pilih-produk").innerHTML = wakil.map(function (p, i) {
      var k = D.kategori.find(function (c) { return c.id === p.kategori; });
      return '<button class="chip" type="button" data-wakil="' + esc(p.id) + '" aria-pressed="' + (i === 0) + '">' + esc(k.nama) + "</button>";
    }).join("");
    $("#pilih-produk").addEventListener("click", function (e) {
      var c = e.target.closest("[data-wakil]");
      if (!c) return;
      aktif = produkById(c.getAttribute("data-wakil"));
      $$("[data-wakil]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
      gambarPanel();
    });
    if (aktif) gambarPanel();

    $("#kategori-grid").innerHTML = D.kategori.map(function (k) {
      var isi = D.produk.filter(function (p) { return p.kategori === k.id; });
      var mulai = isi.length ? Math.min.apply(null, isi.map(hargaTerendah)) : null;
      return '<a class="kartu-kategori" href="katalog.html?kategori=' + esc(k.id) + '">' +
        '<div class="gambar" style="background:' + warnaDari(k.warna).latar + '">' + garmen(k.art, k.warna, k.motif) + "</div>" +
        '<div class="teks"><h3>' + esc(k.nama) + "</h3><p>" + esc(k.deskripsi) + "</p>" +
        (mulai ? "<small>Mulai " + rp(mulai) + "</small>" : "") + "</div></a>";
    }).join("");

    var unggulan = D.produk.filter(function (p) { return p.unggulan; });
    $("#grid-unggulan").innerHTML = (unggulan.length ? unggulan : D.produk).slice(0, 8).map(kartu).join("");

    if (D.testimoni.length) {
      $("#testimoni").hidden = false;
      $("#testi-grid").innerHTML = D.testimoni.map(function (t) {
        return '<blockquote class="testi" style="margin:0"><p>' + esc(t.isi) + "</p><footer>" + esc(t.nama) + (t.kota ? ", " + esc(t.kota) : "") + "</footer></blockquote>";
      }).join("");
    }
  }

  /* ---------- Halaman katalog ---------- */

  function katalog() {
    var awal = new URLSearchParams(location.search).get("kategori");
    var kondisi = { kategori: D.kategori.some(function (k) { return k.id === awal; }) ? awal : "semua", cari: "", bahan: "semua", urut: "hemat" };

    var chips = [{ id: "semua", nama: "Semua" }].concat(D.kategori);
    $("#filter-kategori").innerHTML = chips.map(function (k) {
      return '<button class="chip" type="button" data-kat="' + esc(k.id) + '" aria-pressed="' + (k.id === kondisi.kategori) + '">' + esc(k.nama) + "</button>";
    }).join("");

    var bahan = D.produk.map(function (p) { return p.bahan; }).filter(function (b, i, a) { return b && a.indexOf(b) === i; }).sort();
    $("#filter-bahan").innerHTML = '<option value="semua">Semua bahan</option>' + bahan.map(function (b) {
      return '<option value="' + esc(b) + '">' + esc(b) + "</option>";
    }).join("");

    function gambar() {
      var q = kondisi.cari.trim().toLowerCase();
      var hasil = D.produk.filter(function (p) {
        return (kondisi.kategori === "semua" || p.kategori === kondisi.kategori) &&
          (kondisi.bahan === "semua" || p.bahan === kondisi.bahan) &&
          (!q || (p.nama + " " + (p.bahan || "") + " " + (p.motif || "")).toLowerCase().indexOf(q) > -1);
      }).sort(function (a, b) {
        if (kondisi.urut === "murah") return a.ecer - b.ecer;
        if (kondisi.urut === "mahal") return b.ecer - a.ecer;
        return persen(b) - persen(a);
      });
      var perTanggal = SYNC && SYNC.diperbarui
        ? ", diperbarui dari TikTok " + new Date(SYNC.diperbarui).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "";
      $("#hasil-info").textContent = hasil.length + " produk" + perTanggal;
      $("#grid-katalog").innerHTML = hasil.length ? hasil.map(kartu).join("") :
        '<div class="kosong"><p>Produk tidak ditemukan. Coba kata lain, atau tanya langsung ke admin.</p><a class="btn btn-bata" data-wa href="#">Tanya admin</a></div>';
      ikatTautan();
    }

    $("#filter-kategori").addEventListener("click", function (e) {
      var c = e.target.closest("[data-kat]");
      if (!c) return;
      kondisi.kategori = c.getAttribute("data-kat");
      $$("[data-kat]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
      var url = kondisi.kategori === "semua" ? location.pathname : location.pathname + "?kategori=" + kondisi.kategori;
      history.replaceState(null, "", url);
      gambar();
    });
    $("#cari").addEventListener("input", function (e) { kondisi.cari = e.target.value; gambar(); });
    $("#filter-bahan").addEventListener("change", function (e) { kondisi.bahan = e.target.value; gambar(); });
    $("#urut").addEventListener("change", function (e) { kondisi.urut = e.target.value; gambar(); });
    gambar();
  }

  /* ---------- Mulai ---------- */

  bangunKerangka();
  $$("[data-garmen]").forEach(function (el) {
    var a = el.getAttribute("data-garmen").split(":");
    el.innerHTML = garmen(a[0], a[1], a[2]);
  });
  pasangDialogProduk();
  pasangDaftar();
  perbaruiJumlah();
  if (document.body.getAttribute("data-halaman") === "beranda") beranda();
  else katalog();
  ikatTautan();

  if (location.hash.indexOf("#p=") === 0) bukaProduk(location.hash.slice(3));
})();
