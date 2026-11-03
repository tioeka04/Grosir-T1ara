(function () {
  "use strict";

  /* Halaman admin. Semua perubahan disimpan sebagai commit ke repository GitHub,
     lalu GitHub Pages menerbitkan ulang website dalam 1-2 menit. */

  var BAWAAN = window.TIARA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var angka = function (v) {
    var d = String(v == null ? "" : v).replace(/[^\d]/g, "");
    return d ? Number(d) : null;
  };
  var daftarKoma = function (v) {
    return String(v || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  };
  var tanggal = function (iso) {
    return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  /* ---------- Koneksi GitHub ---------- */

  var REPO = /\.github\.io$/.test(location.hostname)
    ? location.hostname.split(".")[0] + "/" + location.pathname.split("/")[1]
    : "tioeka04/Grosir-T1ara";
  var API = "https://api.github.com";
  // Alamat API lain hanya boleh dipakai saat uji coba di komputer sendiri, supaya kunci tidak bisa dipancing ke server lain.
  var apiUji = new URLSearchParams(location.search).get("api");
  if (apiUji && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) API = apiUji;

  var FILE_ATUR = "js/pengaturan.js";
  var FILE_SYNC = "js/produk-tiktok.js";
  var WORKFLOW = "sync-tiktok.yml";
  var KUNCI = "tiara-token";
  var token = "";

  function ambilToken() {
    try { return localStorage.getItem(KUNCI) || sessionStorage.getItem(KUNCI) || ""; } catch (e) { return ""; }
  }
  function simpanToken(t, ingat) {
    try {
      (ingat ? localStorage : sessionStorage).setItem(KUNCI, t);
    } catch (e) { /* tetap jalan tanpa penyimpanan */ }
  }
  function hapusToken() {
    try { localStorage.removeItem(KUNCI); sessionStorage.removeItem(KUNCI); } catch (e) { /* abaikan */ }
  }

  async function gh(method, path, body) {
    var headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (body) headers["Content-Type"] = "application/json";
    var res = await fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    var data = null;
    if (res.status !== 204) { try { data = await res.json(); } catch (e) { data = null; } }
    if (!res.ok) {
      var err = new Error((data && data.message) || "HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function keBase64(teks) {
    var b = new TextEncoder().encode(teks);
    var s = "";
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function dariBase64(b64) {
    var s = atob(b64.replace(/\s/g, ""));
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return new TextDecoder().decode(b);
  }

  async function bacaFile(path) {
    try {
      var d = await gh("GET", "/repos/" + REPO + "/contents/" + path + "?ref=main");
      var teks = d.content ? dariBase64(d.content) : await (await fetch(d.download_url, { cache: "no-store" })).text();
      return { teks: teks, sha: d.sha };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }
  function tulisFile(path, isiBase64, sha, pesan) {
    var body = { message: pesan, content: isiBase64, branch: "main" };
    if (sha) body.sha = sha;
    return gh("PUT", "/repos/" + REPO + "/contents/" + path, body);
  }

  function pesanGalat(e) {
    if (e.status === 401) return "Kunci akses salah atau sudah kedaluwarsa. Buat kunci baru lalu masuk lagi.";
    if (e.status === 403) return "Kunci akses belum punya izin yang dibutuhkan. Periksa izin Contents dan Actions.";
    if (e.status === 404) return "Repository " + REPO + " tidak bisa diakses dengan kunci ini.";
    if (e.status === 409 || e.status === 422) return "Data sudah diubah dari perangkat lain. Muat ulang halaman, lalu ulangi perubahan.";
    if (!e.status) return "Tidak bisa terhubung ke GitHub. Periksa koneksi internet.";
    return "GitHub menolak permintaan: " + e.message;
  }

  /* ---------- Data ---------- */

  var S = {
    atur: null, asli: "", sha: null, sync: null, unggah: {},
    tab: "produk", saring: "semua", cari: "", pilih: {}, edit: null, runs: null, galatRuns: ""
  };

  function aturBawaan() {
    return {
      toko: {
        nama: BAWAAN.toko.nama, whatsapp: [].concat(BAWAAN.toko.whatsapp || []), tiktok: BAWAAN.toko.tiktok || "",
        instagram: BAWAAN.toko.instagram || "", email: BAWAAN.toko.email || "", alamat: BAWAAN.toko.alamat || "", jamBuka: BAWAAN.toko.jamBuka || ""
      },
      minGrosir: BAWAAN.minGrosir, naikHargaPasar: BAWAAN.naikHargaPasar || 0, modeContoh: BAWAAN.modeContoh, pengumuman: "",
      kategori: JSON.parse(JSON.stringify(BAWAAN.kategori)), testimoni: [], produk: {}, produkManual: []
    };
  }

  function rapikanAtur(a) {
    var dasar = aturBawaan();
    Object.keys(dasar).forEach(function (k) { if (a[k] === undefined) a[k] = dasar[k]; });
    a.toko = Object.assign(dasar.toko, a.toko);
    a.toko.whatsapp = [].concat(a.toko.whatsapp || []);
    return a;
  }

  function bacaSync(teks) {
    var baris = teks.split("\n");
    var waktu = (teks.match(/diperbarui:\s*"([^"]+)"/) || [])[1];
    if (!waktu || baris.length < 2) return null;
    try { return { diperbarui: waktu, produk: JSON.parse(baris[1]) }; } catch (e) { return null; }
  }

  async function muatData() {
    $("#memuat").hidden = false;
    $$("[data-panel]").forEach(function (p) { p.hidden = true; });
    var hasil = await Promise.all([bacaFile(FILE_ATUR), bacaFile(FILE_SYNC)]);
    if (hasil[0]) {
      var t = hasil[0].teks;
      S.atur = rapikanAtur(JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)));
      S.sha = hasil[0].sha;
    } else {
      S.atur = aturBawaan();
      S.sha = null;
    }
    S.asli = JSON.stringify(S.atur);
    S.sync = hasil[1] ? bacaSync(hasil[1].teks) : null;
    S.unggah = {};
    $("#memuat").hidden = true;
    gantiTab(S.tab);
    cekBerubah();
  }

  function adaPerubahan() {
    return JSON.stringify(S.atur) !== S.asli;
  }
  function cekBerubah() {
    $("#bar-simpan").hidden = !adaPerubahan();
  }

  /* ---------- Produk ---------- */

  function pasarOtomatis(ecer) {
    var n = S.atur.naikHargaPasar;
    return n > 0 && ecer ? Math.ceil(ecer * (1 + n / 100) / 1000) * 1000 : null;
  }

  function semuaItem() {
    var dasar = [];
    var sumber = "tiktok";
    if (S.sync && S.sync.produk.length) dasar = S.sync.produk;
    else if (S.atur.modeContoh) { dasar = BAWAAN.produk; sumber = "contoh"; }
    var hasil = dasar.map(function (p) {
      var u = S.atur.produk[p.id] || {};
      var q = Object.assign({}, p);
      Object.keys(u).forEach(function (k) { if (u[k] !== null && u[k] !== "") q[k] = u[k]; });
      return { p: q, dasar: p, ubah: u, sumber: sumber };
    });
    return hasil.concat(S.atur.produkManual.map(function (p) {
      return { p: p, dasar: p, ubah: {}, sumber: "manual" };
    }));
  }
  function cariItem(id) {
    return semuaItem().find(function (x) { return x.p.id === id; });
  }

  function setUbah(id, k, v, nilaiDasar) {
    var u = S.atur.produk[id] || {};
    if (v === null || v === undefined || v === "" || v === nilaiDasar) delete u[k];
    else u[k] = v;
    if (Object.keys(u).length) S.atur.produk[id] = u;
    else delete S.atur.produk[id];
  }
  function ubahCepat(id, k, v) {
    var item = cariItem(id);
    if (!item) return;
    if (item.sumber === "manual") { item.p[k] = v; return; }
    if (k === "tampil") setUbah(id, "tampil", v ? null : false);
    else setUbah(id, k, v, !!item.dasar[k]);
  }

  function namaKategori(id) {
    var k = S.atur.kategori.find(function (x) { return x.id === id; });
    return k ? k.nama : "Lainnya";
  }

  function srcFoto(foto) {
    if (!foto) return "";
    if (S.unggah[foto]) return "data:image/jpeg;base64," + S.unggah[foto];
    return foto;
  }
  function gambarMini(p) {
    var src = srcFoto(p.foto);
    return '<div class="gambar-mini">' + (src
      ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
      : esc((p.nama || "?").charAt(0).toUpperCase())) + "</div>";
  }

  var SARING = [
    ["semua", "Semua", function () { return true; }],
    ["tampil", "Tampil", function (x) { return x.p.tampil !== false; }],
    ["sembunyi", "Disembunyikan", function (x) { return x.p.tampil === false; }],
    ["unggulan", "Unggulan", function (x) { return !!x.p.unggulan; }],
    ["tanpa-grosir", "Belum ada harga grosir", function (x) { return !x.p.grosir; }],
    ["habis", "Stok habis", function (x) { return x.p.stok === 0; }],
    ["manual", "Produk manual", function (x) { return x.sumber === "manual"; }]
  ];

  function panelProduk() {
    var info = S.sync && S.sync.produk.length
      ? "Data dari TikTok, terakhir diperbarui " + tanggal(S.sync.diperbarui) + "."
      : S.atur.modeContoh
        ? "Belum tersambung ke TikTok. Yang tampil sekarang produk contoh."
        : "Belum tersambung ke TikTok. Tambahkan produk manual atau sambungkan TikTok.";
    $("#panel-produk").innerHTML =
      '<div class="panel-kepala"><div><h2>Produk</h2><p class="lembut">' + esc(info) + "</p></div>" +
      '<button class="btn btn-bata btn-kecil" type="button" data-tambah-produk>+ Tambah produk manual</button></div>' +
      '<div class="ringkasan" id="ringkasan"></div>' +
      '<div class="alat"><label class="sr" for="cari-produk">Cari produk</label>' +
      '<input class="kolom" id="cari-produk" type="search" placeholder="Cari nama produk" value="' + esc(S.cari) + '" autocomplete="off"></div>' +
      '<div class="saring">' + SARING.map(function (s) {
        return '<button class="chip" type="button" data-saring="' + s[0] + '" aria-pressed="' + (S.saring === s[0]) + '">' + s[1] + "</button>";
      }).join("") + "</div>" +
      '<div id="aksi-massal"></div><div class="daftar-produk" id="daftar-produk"></div>';
    gambarDaftarProduk();
  }

  function gambarDaftarProduk() {
    var semua = semuaItem();
    var tampil = semua.filter(SARING[1][2]).length;
    $("#ringkasan").innerHTML = [
      [semua.length, "total produk"], [tampil, "tampil di website"],
      [semua.length - tampil, "disembunyikan"], [semua.filter(SARING[4][2]).length, "belum ada harga grosir"]
    ].map(function (r) { return "<div><b>" + r[0] + "</b><span>" + r[1] + "</span></div>"; }).join("");

    var uji = SARING.find(function (s) { return s[0] === S.saring; })[2];
    var q = S.cari.trim().toLowerCase();
    var hasil = semua.filter(function (x) { return uji(x) && (!q || x.p.nama.toLowerCase().indexOf(q) > -1); });

    Object.keys(S.pilih).forEach(function (id) { if (!cariItem(id)) delete S.pilih[id]; });
    var jmlPilih = Object.keys(S.pilih).length;
    $("#aksi-massal").innerHTML = jmlPilih ? '<div class="aksi-massal"><span>' + jmlPilih + " produk dipilih</span>" +
      '<button class="btn btn-putih btn-kecil" type="button" data-massal="tampil">Tampilkan</button>' +
      '<button class="btn btn-putih btn-kecil" type="button" data-massal="sembunyi">Sembunyikan</button>' +
      '<button class="btn btn-putih btn-kecil" type="button" data-massal="unggul">Jadikan unggulan</button>' +
      '<button class="btn btn-putih btn-kecil" type="button" data-massal="bukan-unggul">Hapus unggulan</button>' +
      '<button class="btn-teks" type="button" data-massal="batal">Batal pilih</button></div>' : "";

    var semuaDipilih = hasil.length && hasil.every(function (x) { return S.pilih[x.p.id]; });
    $("#daftar-produk").innerHTML =
      '<div class="baris-produk kepala-tabel"><input type="checkbox" data-pilih-semua aria-label="Pilih semua"' + (semuaDipilih ? " checked" : "") + ">" +
      "<span></span><span>Produk</span><span>Kategori</span><span>Harga</span><span>Tampil</span><span>Unggul</span><span></span></div>" +
      (hasil.length ? hasil.map(barisProduk).join("") : '<p class="memuat">Tidak ada produk yang cocok.</p>');
  }

  function barisProduk(x) {
    var p = x.p;
    var lencana = [x.sumber === "manual" ? "Manual" : x.sumber === "contoh" ? "Contoh" : "TikTok"];
    if (Object.keys(x.ubah).length) lencana.push("Diubah");
    var peringatan = [];
    if (p.stok === 0) peringatan.push("Stok habis");
    if (!p.grosir) peringatan.push("Belum ada grosir");
    var pasar = p.pasar || pasarOtomatis(p.ecer);
    return '<div class="baris-produk' + (p.tampil === false ? " redup" : "") + '">' +
      '<input type="checkbox" data-pilih="' + esc(p.id) + '" aria-label="Pilih ' + esc(p.nama) + '"' + (S.pilih[p.id] ? " checked" : "") + ">" +
      gambarMini(p) +
      '<div class="nama-produk"><b title="' + esc(p.nama) + '">' + esc(p.nama) + '</b><div class="lencana-baris">' +
      lencana.map(function (l) { return '<span class="lencana">' + l + "</span>"; }).join("") +
      peringatan.map(function (l) { return '<span class="lencana peringatan">' + l + "</span>"; }).join("") + "</div></div>" +
      "<span>" + esc(namaKategori(p.kategori)) + "</span>" +
      '<div class="harga-baris"><b>' + rp(p.ecer) + "</b>" +
      "<span>Grosir " + (p.grosir ? rp(p.grosir) : "<em>belum diisi</em>") + "</span>" +
      "<span>Pasar " + (pasar ? rp(pasar) + (p.pasar ? "" : " <em>(otomatis)</em>") : "<em>-</em>") + "</span></div>" +
      '<label class="saklar" title="Tampil di website"><input type="checkbox" data-tampil="' + esc(p.id) + '" aria-label="Tampilkan ' + esc(p.nama) + '"' +
      (p.tampil !== false ? " checked" : "") + "><span></span></label>" +
      '<button class="bintang" type="button" data-unggul="' + esc(p.id) + '" aria-pressed="' + !!p.unggulan + '" aria-label="Unggulan" title="Tampil di beranda">&#9733;</button>' +
      '<button class="btn btn-garis btn-kecil" style="color:var(--bata)" type="button" data-edit="' + esc(p.id) + '">Edit</button></div>';
  }

  function opsiKategori(terpilih) {
    return S.atur.kategori.concat({ id: "lainnya", nama: "Lainnya" }).map(function (k) {
      return '<option value="' + esc(k.id) + '"' + (k.id === terpilih ? " selected" : "") + ">" + esc(k.nama) + "</option>";
    }).join("");
  }

  function isian(label, nama, nilai, atribut, catatan) {
    return '<label class="isian"><span>' + label + (catatan ? " <small>" + catatan + "</small>" : "") + "</span>" +
      '<input class="kolom" name="' + nama + '" value="' + esc(nilai == null ? "" : nilai) + '" ' + (atribut || "") + "></label>";
  }

  function bukaEdit(id) {
    var item = id ? cariItem(id) : null;
    var manual = !item || item.sumber === "manual";
    var p = item ? item.p : {
      id: "m" + Date.now().toString(36), nama: "", kategori: (S.atur.kategori[0] || { id: "lainnya" }).id, bahan: "",
      ecer: null, grosir: null, pasar: null, warna: [], ukuran: [], foto: "", deskripsi: "", stok: null, tiktok: "", unggulan: false, tampil: true
    };
    var u = item ? item.ubah : {};
    var d = item ? item.dasar : {};
    S.edit = { id: p.id, baru: !item, manual: manual, foto: manual ? p.foto || "" : u.foto || "", dasar: d };

    var nilai = function (k) { return manual ? p[k] : u[k]; };
    var otomatis = pasarOtomatis(manual ? p.ecer : (u.ecer || d.ecer));
    var html =
      '<form class="edit-isi" id="form-edit" novalidate>' +
      '<button class="tutup" type="button" data-tutup aria-label="Tutup">&times;</button>' +
      '<h2 id="judul-edit">' + (item ? "Edit produk" : "Tambah produk manual") + "</h2>" +
      (manual ? "" : '<p class="lembut"><b>' + esc(p.nama) + "</b><br>Kolom yang dikosongkan memakai data dari " + (item.sumber === "contoh" ? "produk contoh" : "TikTok") + ".</p>") +
      '<div class="foto-edit"><div id="pratinjau-foto">' + gambarMini({ nama: p.nama, foto: S.edit.foto || d.foto }) + "</div>" +
      '<div class="tombol-foto"><label class="btn btn-garis btn-kecil" style="color:var(--bata)">Ganti foto<input type="file" id="foto-baru" accept="image/*" hidden></label>' +
      (!manual ? '<button class="btn-teks" type="button" id="pakai-asli"' + (S.edit.foto ? "" : " hidden") + ">Pakai foto asli</button>" : "") +
      '<small class="lembut">Foto otomatis diperkecil supaya website tetap cepat.</small></div></div>' +
      (manual ? isian("Nama produk", "nama", p.nama, "required") : "") +
      '<div class="dua-kolom">' +
      '<label class="isian"><span>Kategori</span><select class="kolom" name="kategori">' + opsiKategori(p.kategori) + "</select></label>" +
      isian("Bahan", "bahan", nilai("bahan"), manual ? "" : 'placeholder="' + esc(d.bahan || "-") + '"') +
      isian("Harga eceran", "ecer", nilai("ecer"), 'inputmode="numeric"' + (manual ? " required" : ' placeholder="' + (d.ecer ? "Dari TikTok: " + rp(d.ecer) : "") + '"')) +
      isian("Harga grosir", "grosir", nilai("grosir"), 'inputmode="numeric" placeholder="' + (d.grosir && !manual ? rp(d.grosir) : "Belum diisi") + '"', "mulai " + S.atur.minGrosir + " pcs") +
      isian("Harga pasaran", "pasar", nilai("pasar"), 'inputmode="numeric" placeholder="' + (d.pasar && !manual ? rp(d.pasar) : otomatis ? "Otomatis: " + rp(otomatis) : "Kosong") + '"', "kosongkan untuk otomatis") +
      (manual ? isian("Stok", "stok", p.stok, 'inputmode="numeric" placeholder="Kosong = tersedia"', "isi 0 kalau habis") : "") +
      "</div>" +
      (manual
        ? '<div class="dua-kolom">' + isian("Warna", "warna", (p.warna || []).join(", "), 'placeholder="Mocca, Hitam"', "pisahkan dengan koma") +
          isian("Ukuran", "ukuran", (p.ukuran || []).join(", "), 'placeholder="M, L, XL"', "pisahkan dengan koma") + "</div>" +
          '<label class="isian"><span>Deskripsi</span><textarea class="kolom" name="deskripsi">' + esc(p.deskripsi) + "</textarea></label>" +
          isian("Link TikTok Shop", "tiktok", p.tiktok, 'type="url" placeholder="https://..."', "opsional")
        : "") +
      '<label class="centang"><input type="checkbox" name="tampil"' + (p.tampil !== false ? " checked" : "") + "> Tampilkan di website</label>" +
      '<label class="centang"><input type="checkbox" name="unggulan"' + (p.unggulan ? " checked" : "") + "> Jadikan unggulan di beranda</label>" +
      '<p class="galat" id="galat-edit" hidden></p>' +
      '<div class="aksi-edit">' +
      (manual && item ? '<button class="btn-teks kiri" type="button" data-hapus-produk>Hapus produk</button>' : "") +
      '<button class="btn btn-garis btn-kecil" style="color:var(--bata)" type="button" data-tutup>Batal</button>' +
      '<button class="btn btn-bata btn-kecil" type="submit">Terapkan</button></div></form>';
    var dlg = $("#dialog-edit");
    dlg.innerHTML = html;
    dlg.showModal();
  }

  function terapkanEdit() {
    var f = $("#form-edit").elements;
    var E = S.edit;
    var galat = $("#galat-edit");
    if (E.manual) {
      var nama = f.nama.value.trim();
      var ecer = angka(f.ecer.value);
      if (!nama || !ecer) { galat.textContent = "Nama produk dan harga eceran wajib diisi."; galat.hidden = false; return false; }
      var obj = {
        id: E.id, nama: nama, kategori: f.kategori.value, bahan: f.bahan.value.trim(), ecer: ecer,
        grosir: angka(f.grosir.value), pasar: angka(f.pasar.value),
        warna: daftarKoma(f.warna.value), ukuran: daftarKoma(f.ukuran.value), foto: E.foto,
        deskripsi: f.deskripsi.value.trim(), stok: f.stok.value.trim() === "" ? null : angka(f.stok.value),
        tiktok: f.tiktok.value.trim(), unggulan: f.unggulan.checked, tampil: f.tampil.checked
      };
      var i = S.atur.produkManual.findIndex(function (x) { return x.id === E.id; });
      if (i < 0) S.atur.produkManual.push(obj);
      else S.atur.produkManual[i] = obj;
    } else {
      var d = E.dasar;
      setUbah(E.id, "kategori", f.kategori.value, d.kategori);
      setUbah(E.id, "bahan", f.bahan.value.trim(), d.bahan);
      setUbah(E.id, "ecer", angka(f.ecer.value), d.ecer);
      setUbah(E.id, "grosir", angka(f.grosir.value), d.grosir);
      setUbah(E.id, "pasar", angka(f.pasar.value), d.pasar);
      setUbah(E.id, "foto", E.foto, d.foto);
      setUbah(E.id, "tampil", f.tampil.checked ? null : false);
      setUbah(E.id, "unggulan", f.unggulan.checked, !!d.unggulan);
    }
    return true;
  }

  function kecilkanFoto(file) {
    return new Promise(function (ok, gagal) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var skala = Math.min(1, 1200 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * skala);
        c.height = Math.round(img.height * skala);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error("File ini bukan gambar.")); };
      img.src = url;
    });
  }

  /* ---------- Kategori ---------- */

  var ILUSTRASI = [["gamis", "Gamis"], ["kebaya", "Kebaya"], ["tunik", "Tunik"], ["atasan", "Atasan"]];
  var WARNA_KAT = [["bata", "Merah bata"], ["marun", "Marun"], ["salem", "Salem"], ["abu", "Abu"]];
  function pilihan(daftar, nilai) {
    return daftar.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === nilai ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
  }

  function panelKategori() {
    var semua = semuaItem();
    var k = S.atur.kategori;
    $("#panel-kategori").innerHTML =
      '<div class="panel-kepala"><div><h2>Kategori</h2><p class="lembut">Urutan di sini sama dengan urutan di website. Kategori tanpa produk tidak ditampilkan.</p></div></div>' +
      '<div class="kotak"><div class="daftar-isian">' + k.map(function (x, i) {
        var jml = semua.filter(function (s) { return s.p.kategori === x.id; }).length;
        return '<div class="baris-isian baris-kategori">' +
          '<label class="isian"><span>Nama <small>' + jml + " produk</small></span><input class=\"kolom\" data-kat=\"" + i + '" data-f="nama" value="' + esc(x.nama) + '"></label>' +
          '<label class="isian"><span>Keterangan singkat</span><input class="kolom" data-kat="' + i + '" data-f="deskripsi" value="' + esc(x.deskripsi) + '"></label>' +
          '<label class="isian"><span>Ilustrasi</span><select class="kolom" data-kat="' + i + '" data-f="art">' + pilihan(ILUSTRASI, x.art) + "</select></label>" +
          '<label class="isian"><span>Warna</span><select class="kolom" data-kat="' + i + '" data-f="warna">' + pilihan(WARNA_KAT, x.warna) + "</select></label>" +
          '<div class="aksi-baris"><button class="ikon-btn" type="button" data-kat-geser="' + i + '" data-arah="-1" aria-label="Naikkan"' + (i === 0 ? " disabled" : "") + ">&uarr;</button>" +
          '<button class="ikon-btn" type="button" data-kat-geser="' + i + '" data-arah="1" aria-label="Turunkan"' + (i === k.length - 1 ? " disabled" : "") + ">&darr;</button>" +
          '<button class="ikon-btn" type="button" data-kat-hapus="' + i + '" aria-label="Hapus kategori">&times;</button></div></div>';
      }).join("") + "</div>" +
      '<div class="alat"><input class="kolom" id="kat-baru" placeholder="Nama kategori baru, misal Rok"><button class="btn btn-bata btn-kecil" type="button" id="tambah-kat">Tambah kategori</button></div></div>';
  }

  /* ---------- Toko ---------- */

  function panelToko() {
    var a = S.atur;
    var t = a.toko;
    var teks = function (label, k, ph) {
      return '<label class="isian"><span>' + label + '</span><input class="kolom" data-toko="' + k + '" value="' + esc(t[k]) + '" placeholder="' + esc(ph || "") + '"></label>';
    };
    $("#panel-toko").innerHTML =
      '<div class="panel-kepala"><div><h2>Toko</h2><p class="lembut">Kontak dan aturan harga yang tampil di website.</p></div></div>' +
      '<div class="kotak"><h3>Pengumuman</h3>' +
      '<label class="isian"><span>Teks di bagian paling atas website <small>kosongkan untuk menyembunyikan</small></span>' +
      '<input class="kolom" data-atur="pengumuman" value="' + esc(a.pengumuman) + '" placeholder="Contoh: Gratis ongkir untuk pembelian grosir minggu ini"></label></div>' +
      '<div class="kotak"><h3>Nomor WhatsApp admin</h3><p class="lembut">Pengunjung dibagi rata ke nomor-nomor ini. Boleh ditulis 08xx atau 628xx.</p><div class="daftar-isian">' +
      t.whatsapp.map(function (n, i) {
        return '<div class="baris-isian baris-nomor"><label class="isian"><span>Admin ' + (i + 1) + '</span><input class="kolom" inputmode="tel" data-wa-i="' + i + '" value="' + esc(n) + '"></label>' +
          '<button class="ikon-btn" type="button" data-wa-hapus="' + i + '" aria-label="Hapus nomor">&times;</button></div>';
      }).join("") + '</div><div><button class="btn btn-garis btn-kecil" style="color:var(--bata)" type="button" id="tambah-wa">+ Tambah nomor</button></div></div>' +
      '<div class="kotak"><h3>Harga</h3><div class="dua-kolom">' +
      '<label class="isian"><span>Minimal pembelian grosir <small>pcs, boleh campur model</small></span><input class="kolom" inputmode="numeric" data-atur="minGrosir" data-jenis="angka" value="' + esc(a.minGrosir) + '"></label>' +
      '<label class="isian"><span>Harga pasaran otomatis <small>% di atas harga eceran, 0 = mati</small></span><input class="kolom" inputmode="numeric" data-atur="naikHargaPasar" data-jenis="angka" value="' + esc(a.naikHargaPasar) + '"></label>' +
      "</div></div>" +
      '<div class="kotak"><h3>Kontak dan media sosial</h3><div class="dua-kolom">' +
      teks("Nama toko", "nama") + teks("Link TikTok", "tiktok", "https://www.tiktok.com/@...") +
      teks("Link Instagram", "instagram", "https://instagram.com/...") + teks("Email", "email") +
      teks("Alamat", "alamat") + teks("Jam buka", "jamBuka", "Senin-Sabtu, 08.00-17.00") + "</div></div>" +
      '<div class="kotak"><h3>Produk contoh</h3>' +
      '<label class="centang"><input type="checkbox" data-atur="modeContoh" data-jenis="cek"' + (a.modeContoh ? " checked" : "") + "> Tampilkan produk contoh selama TikTok belum tersambung</label>" +
      '<p class="lembut">Setelah TikTok tersambung, produk contoh otomatis diganti produk asli.</p></div>';
  }

  /* ---------- Testimoni ---------- */

  function panelTestimoni() {
    $("#panel-testimoni").innerHTML =
      '<div class="panel-kepala"><div><h2>Testimoni</h2><p class="lembut">Tampil di beranda kalau minimal ada satu. Pakai testimoni asli dari pelanggan.</p></div>' +
      '<button class="btn btn-bata btn-kecil" type="button" id="tambah-testi">+ Tambah testimoni</button></div>' +
      '<div class="kotak">' + (S.atur.testimoni.length ? '<div class="daftar-isian">' + S.atur.testimoni.map(function (x, i) {
        return '<div class="baris-isian baris-testi">' +
          '<label class="isian"><span>Nama</span><input class="kolom" data-testi="' + i + '" data-f="nama" value="' + esc(x.nama) + '"></label>' +
          '<label class="isian"><span>Kota</span><input class="kolom" data-testi="' + i + '" data-f="kota" value="' + esc(x.kota) + '"></label>' +
          '<label class="isian"><span>Isi testimoni</span><textarea class="kolom" data-testi="' + i + '" data-f="isi">' + esc(x.isi) + "</textarea></label>" +
          '<button class="ikon-btn" type="button" data-testi-hapus="' + i + '" aria-label="Hapus testimoni">&times;</button></div>';
      }).join("") + "</div>" : '<p class="lembut">Belum ada testimoni.</p>') + "</div>";
  }

  /* ---------- Sinkron TikTok ---------- */

  function panelSinkron() {
    var s = S.sync;
    var runs = S.runs;
    $("#panel-sinkron").innerHTML =
      '<div class="panel-kepala"><div><h2>Sinkron TikTok</h2><p class="lembut">Produk diambil otomatis dari TikTok Shop setiap 6 jam.</p></div></div>' +
      '<div class="kotak"><h3>Data saat ini</h3><p>' + (s
        ? "<b>" + s.produk.length + " produk</b> dari TikTok, terakhir berubah " + esc(tanggal(s.diperbarui)) + "."
        : "Belum ada data dari TikTok. Pasang kunci TikTok dulu sesuai PANDUAN-TIKTOK.md.") + "</p>" +
      '<div><button class="btn btn-bata btn-kecil" type="button" id="sinkron-sekarang">Sinkronkan sekarang</button></div>' +
      '<p class="lembut">Sinkron butuh beberapa menit. Kalau kunci TikTok belum dipasang, sinkron dilewati.</p></div>' +
      '<div class="kotak"><h3>Riwayat sinkron</h3>' +
      (S.galatRuns ? '<p class="galat">' + esc(S.galatRuns) + "</p>"
        : !runs ? '<p class="lembut">Memuat...</p>'
          : !runs.length ? '<p class="lembut">Belum pernah dijalankan.</p>'
            : '<div class="riwayat">' + runs.map(function (r) {
              var st = r.status !== "completed" ? ["Sedang berjalan", ""] : r.conclusion === "success" ? ["Berhasil", "ok"] : ["Gagal", "gagal"];
              return '<div><span>' + esc(tanggal(r.created_at)) + (r.event === "schedule" ? " &middot; terjadwal" : " &middot; manual") + "</span>" +
                '<a class="status ' + st[1] + '" href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' + st[0] + "</a></div>";
            }).join("") + "</div>") +
      '<div><button class="btn-teks" type="button" id="muat-riwayat">Muat ulang</button></div></div>';
  }

  async function muatRiwayat() {
    S.runs = null;
    S.galatRuns = "";
    if (S.tab === "sinkron") panelSinkron();
    try {
      var d = await gh("GET", "/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/runs?per_page=6");
      S.runs = d.workflow_runs || [];
    } catch (e) {
      S.galatRuns = e.status === 403 || e.status === 404
        ? "Kunci akses belum punya izin Actions. Buat kunci baru dengan izin Actions: Read and write."
        : pesanGalat(e);
    }
    if (S.tab === "sinkron") panelSinkron();
  }

  /* ---------- Simpan ---------- */

  function rapikanNomor(n) {
    var d = String(n).replace(/[^\d]/g, "");
    if (d.charAt(0) === "0") d = "62" + d.slice(1);
    return d;
  }

  async function simpan() {
    var tombol = $("#simpan");
    tombol.disabled = true;
    tombol.textContent = "Menyimpan...";
    try {
      S.atur.toko.whatsapp = S.atur.toko.whatsapp.map(rapikanNomor).filter(Boolean);
      var isi = JSON.stringify(S.atur, null, 2);
      var foto = Object.keys(S.unggah).filter(function (path) { return isi.indexOf(path) > -1; });
      for (var i = 0; i < foto.length; i++) {
        await tulisFile(foto[i], S.unggah[foto[i]], null, "Admin: unggah foto produk");
      }
      var teks = "/* Diubah lewat halaman admin (admin.html). Kalau diedit manual, isinya harus tetap JSON yang valid. */\n" +
        "window.TIARA_ATUR = " + isi + ";\n";
      var r = await tulisFile(FILE_ATUR, keBase64(teks), S.sha, "Admin: ubah pengaturan website");
      S.sha = r.content.sha;
      S.asli = JSON.stringify(S.atur);
      S.unggah = {};
      cekBerubah();
      gantiTab(S.tab);
      notif("Tersimpan. Website diperbarui dalam 1-2 menit.");
    } catch (e) {
      notif(pesanGalat(e), true);
    } finally {
      tombol.disabled = false;
      tombol.innerHTML = "Simpan &amp; terbitkan";
    }
  }

  /* ---------- Tampilan umum ---------- */

  var PANEL = { produk: panelProduk, kategori: panelKategori, toko: panelToko, testimoni: panelTestimoni, sinkron: panelSinkron };
  function gantiTab(tab) {
    S.tab = tab;
    $$("[data-tab]").forEach(function (b) {
      if (b.getAttribute("data-tab") === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    $$("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== tab; });
    PANEL[tab]();
    if (tab === "sinkron" && !S.runs && !S.galatRuns) muatRiwayat();
  }

  var waktuNotif;
  function notif(teks, lama) {
    var n = $("#notif");
    n.textContent = teks;
    n.classList.add("tampil");
    clearTimeout(waktuNotif);
    waktuNotif = setTimeout(function () { n.classList.remove("tampil"); }, lama ? 7000 : 3000);
  }

  async function masuk(t, ingat) {
    token = t;
    await gh("GET", "/repos/" + REPO);
    if (ingat !== undefined) simpanToken(t, ingat);
    $("#layar-masuk").hidden = true;
    $("#layar-admin").hidden = false;
    await muatData();
  }

  /* ---------- Kejadian ---------- */

  $("#form-masuk").addEventListener("submit", async function (e) {
    e.preventDefault();
    var g = $("#galat-masuk");
    var b = $("#tombol-masuk");
    g.hidden = true;
    b.disabled = true;
    b.textContent = "Memeriksa...";
    try {
      await masuk($("#token").value.trim(), $("#ingat").checked);
    } catch (err) {
      token = "";
      g.textContent = pesanGalat(err);
      g.hidden = false;
    } finally {
      b.disabled = false;
      b.textContent = "Masuk";
    }
  });

  function ikatIsian(e) {
    var el = e.target;
    var a = S.atur;
    if (!a) return;
    if (el.hasAttribute("data-toko")) a.toko[el.getAttribute("data-toko")] = el.value;
    else if (el.hasAttribute("data-atur")) {
      var jenis = el.getAttribute("data-jenis");
      a[el.getAttribute("data-atur")] = jenis === "cek" ? el.checked : jenis === "angka" ? (angka(el.value) || 0) : el.value;
    } else if (el.hasAttribute("data-wa-i")) a.toko.whatsapp[Number(el.getAttribute("data-wa-i"))] = el.value;
    else if (el.hasAttribute("data-kat")) a.kategori[Number(el.getAttribute("data-kat"))][el.getAttribute("data-f")] = el.value;
    else if (el.hasAttribute("data-testi")) a.testimoni[Number(el.getAttribute("data-testi"))][el.getAttribute("data-f")] = el.value;
    else if (el.id === "cari-produk") { S.cari = el.value; gambarDaftarProduk(); return; }
    else return;
    cekBerubah();
  }
  document.addEventListener("input", ikatIsian);

  document.addEventListener("change", async function (e) {
    var el = e.target;
    if (el.hasAttribute("data-atur") && el.type === "checkbox") { ikatIsian(e); return; }
    if (el.hasAttribute("data-pilih")) {
      if (el.checked) S.pilih[el.getAttribute("data-pilih")] = true;
      else delete S.pilih[el.getAttribute("data-pilih")];
      gambarDaftarProduk();
    } else if (el.hasAttribute("data-pilih-semua")) {
      $$("[data-pilih]").forEach(function (c) {
        if (el.checked) S.pilih[c.getAttribute("data-pilih")] = true;
        else delete S.pilih[c.getAttribute("data-pilih")];
      });
      gambarDaftarProduk();
    } else if (el.hasAttribute("data-tampil")) {
      ubahCepat(el.getAttribute("data-tampil"), "tampil", el.checked);
      gambarDaftarProduk();
      cekBerubah();
    } else if (el.id === "foto-baru" && el.files[0]) {
      try {
        var b64 = await kecilkanFoto(el.files[0]);
        var slug = ((S.edit.manual && $("#form-edit").elements.nama.value) || S.edit.id).toLowerCase()
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produk";
        var path = "img/produk/" + slug + "-" + Date.now().toString(36) + ".jpg";
        S.unggah[path] = b64;
        S.edit.foto = path;
        $("#pratinjau-foto").innerHTML = gambarMini({ foto: path });
        var asli = $("#pakai-asli");
        if (asli) asli.hidden = false;
      } catch (err) {
        var g = $("#galat-edit");
        g.textContent = err.message;
        g.hidden = false;
      }
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "form-edit") return;
    e.preventDefault();
    if (!terapkanEdit()) return;
    $("#dialog-edit").close();
    gambarDaftarProduk();
    cekBerubah();
    notif("Diterapkan. Klik Simpan & terbitkan supaya tampil di website.");
  });

  document.addEventListener("click", function (e) {
    var t = e.target;
    var cari = function (s) { return t.closest(s); };
    var el;
    var a = S.atur;

    if ((el = cari("[data-tab]"))) return gantiTab(el.getAttribute("data-tab"));
    if (cari("#keluar")) {
      if (adaPerubahan() && !confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return;
      hapusToken();
      S.asli = JSON.stringify(S.atur);
      location.reload();
      return;
    }
    if (cari("#simpan")) return simpan();
    if (cari("#batal")) {
      if (!confirm("Batalkan semua perubahan yang belum disimpan?")) return;
      S.atur = JSON.parse(S.asli);
      S.unggah = {};
      cekBerubah();
      return gantiTab(S.tab);
    }

    /* Produk */
    if ((el = cari("[data-saring]"))) { S.saring = el.getAttribute("data-saring"); return panelProduk(); }
    if ((el = cari("[data-unggul]"))) {
      ubahCepat(el.getAttribute("data-unggul"), "unggulan", el.getAttribute("aria-pressed") !== "true");
      gambarDaftarProduk();
      return cekBerubah();
    }
    if ((el = cari("[data-edit]"))) return bukaEdit(el.getAttribute("data-edit"));
    if (cari("[data-tambah-produk]")) return bukaEdit(null);
    if ((el = cari("[data-massal]"))) {
      var aksi = el.getAttribute("data-massal");
      Object.keys(S.pilih).forEach(function (id) {
        if (aksi === "tampil" || aksi === "sembunyi") ubahCepat(id, "tampil", aksi === "tampil");
        if (aksi === "unggul" || aksi === "bukan-unggul") ubahCepat(id, "unggulan", aksi === "unggul");
      });
      S.pilih = {};
      gambarDaftarProduk();
      return cekBerubah();
    }

    /* Dialog edit */
    var dlg = $("#dialog-edit");
    if (t === dlg || cari("[data-tutup]")) return dlg.close();
    if (cari("#pakai-asli")) {
      S.edit.foto = "";
      $("#pratinjau-foto").innerHTML = gambarMini({ foto: S.edit.dasar.foto });
      t.hidden = true;
      return;
    }
    if (cari("[data-hapus-produk]")) {
      if (!confirm("Hapus produk ini dari website?")) return;
      a.produkManual = a.produkManual.filter(function (x) { return x.id !== S.edit.id; });
      dlg.close();
      gambarDaftarProduk();
      return cekBerubah();
    }

    /* Kategori */
    if ((el = cari("[data-kat-geser]"))) {
      var i = Number(el.getAttribute("data-kat-geser"));
      var j = i + Number(el.getAttribute("data-arah"));
      var x = a.kategori[i];
      a.kategori[i] = a.kategori[j];
      a.kategori[j] = x;
      panelKategori();
      return cekBerubah();
    }
    if ((el = cari("[data-kat-hapus]"))) {
      var k = a.kategori[Number(el.getAttribute("data-kat-hapus"))];
      var jml = semuaItem().filter(function (s) { return s.p.kategori === k.id; }).length;
      if (!confirm("Hapus kategori " + k.nama + "?" + (jml ? " " + jml + " produk di dalamnya akan pindah ke Lainnya." : ""))) return;
      a.kategori.splice(Number(el.getAttribute("data-kat-hapus")), 1);
      panelKategori();
      return cekBerubah();
    }
    if (cari("#tambah-kat")) {
      var nama = $("#kat-baru").value.trim();
      if (!nama) return $("#kat-baru").focus();
      var id = nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kategori";
      var dasar = id;
      for (var n = 2; a.kategori.some(function (c) { return c.id === id; }) || id === "lainnya"; n++) id = dasar + "-" + n;
      a.kategori.push({ id: id, nama: nama, deskripsi: "", art: "tunik", warna: "bata", motif: "polos" });
      panelKategori();
      return cekBerubah();
    }

    /* Toko */
    if (cari("#tambah-wa")) { a.toko.whatsapp.push(""); panelToko(); $$("[data-wa-i]").pop().focus(); return cekBerubah(); }
    if ((el = cari("[data-wa-hapus]"))) { a.toko.whatsapp.splice(Number(el.getAttribute("data-wa-hapus")), 1); panelToko(); return cekBerubah(); }

    /* Testimoni */
    if (cari("#tambah-testi")) { a.testimoni.push({ nama: "", kota: "", isi: "" }); panelTestimoni(); return cekBerubah(); }
    if ((el = cari("[data-testi-hapus]"))) { a.testimoni.splice(Number(el.getAttribute("data-testi-hapus")), 1); panelTestimoni(); return cekBerubah(); }

    /* Sinkron */
    if (cari("#muat-riwayat")) return muatRiwayat();
    if ((el = cari("#sinkron-sekarang"))) {
      el.disabled = true;
      gh("POST", "/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/dispatches", { ref: "main" })
        .then(function () {
          notif("Sinkron dimulai. Cek riwayat beberapa menit lagi.");
          setTimeout(muatRiwayat, 4000);
        })
        .catch(function (err) {
          notif(err.status === 403 || err.status === 404 ? "Kunci akses belum punya izin Actions: Read and write." : pesanGalat(err), true);
        })
        .finally(function () { el.disabled = false; });
    }
  });

  window.addEventListener("beforeunload", function (e) {
    if (S.atur && adaPerubahan()) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Mulai ---------- */

  var tersimpan = ambilToken();
  if (tersimpan) {
    masuk(tersimpan).catch(function (err) {
      if (err.status === 401) hapusToken();
      $("#layar-admin").hidden = true;
      $("#layar-masuk").hidden = false;
      var g = $("#galat-masuk");
      g.textContent = pesanGalat(err);
      g.hidden = false;
    });
  }
})();
