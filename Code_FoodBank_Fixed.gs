/**
 * FOOD BANK SISWA — JPP POLITEKNIK KOTA KINABALU
 * Sistem inventori & ambilan barang (Google Apps Script web app)
 *
 * Pasang:
 *   1. Buka Google Sheet respons "Borang Rekod Pengambilan Barang Foodbank JPP".
 *   2. Sambungan (Extensions) → Apps Script. Tampal fail ini sebagai Code.gs
 *      dan fail Index.html sebagai fail HTML bernama "Index".
 *   3. Pilih fungsi `pasang` dan tekan Run (benarkan akses apabila diminta).
 *   4. Deploy → New deployment → Web app
 *        Execute as: Me   |   Who has access: Anyone
 *
 * Semua tetapan (had item, selang hari, logo, dll.) diubah dalam tab "Tetapan".
 * Senarai staf JPP diurus dalam tab "Staf".
 */
 
const TZ = 'Asia/Kuala_Lumpur';
 
const SH = {
  STOK: 'Stok',
  LOG: 'Log Stok',
  AMBIL: 'Ambilan',
  PELAJAR: 'Pelajar',
  STAF: 'Staf',
  TETAPAN: 'Tetapan',
  HAD: 'Had Ambilan'
};
 
const HEAD = {
  Stok: ['ID', 'Nama', 'Kategori', 'Unit', 'Stok', 'Stok Minimum', 'Lokasi', 'Tarikh Luput', 'Dikemas Kini'],
  'Log Stok': ['Masa', 'Jenis', 'ID Item', 'Item', 'Kuantiti', 'Sebelum', 'Selepas', 'Oleh', 'Catatan'],
  Ambilan: ['Masa', 'Email', 'Nama', 'No. Matriks', 'Barang', 'Jumlah Item', 'Ulasan', 'Direkod Oleh', 'ID Ambilan'],
  Pelajar: ['Email', 'Nama', 'No. Matriks', 'No. Telefon', 'Didaftar'],
  Staf: ['Email', 'Nama', 'Jawatan'],
  Tetapan: ['Kunci', 'Nilai', 'Keterangan'],
  'Had Ambilan': ['Kategori', 'Had Sekali Ambil', 'Papar Kepada Pelajar', 'Keterangan']
};
 
/**
 * Had setiap kategori mengikut poster "Panduan Pengambilan Barangan".
 * 2 paket Maggi dikira sebagai 1 item.
 * 2 sachet 3 In 1 dikira sebagai 1 item.
 * Stok fizikal tetap dipantau oleh staf.
 */
const HAD_ASAL = [
  ['Maggi (Paket)', 1, 'Ya', 'Maksimum 2 paket dikira sebagai 1 item'],
  ['Maggi Cup', 1, 'Ya', 'Maksimum 1 Maggi Cup'],
  ['Maggi (Paket) + Maggi Cup', 2, '', 'Jumlah item Maggi paket dan cup tidak melebihi 2'],
  ['3 In 1', 1, 'Ya', 'Maksimum 2 sachet dikira sebagai 1 item'],
  ['Biskut Hup Seng', 1, 'Ya', '1 paket sahaja'],
  ['Biskut Lain', 1, 'Ya', '2 sahaja'],
  ['Makanan Tin', 1, 'Ya', '1 tin sardin ATAU 1 tin ayam kari'],
  ['Cereal', 1, 'Ya', '1 kotak sahaja'],
  ['Air Kotak', 1, 'Ya', '1 kotak sahaja'],
  ['Nabati', 2, 'Ya', '2 sahaja'],
  ['Turut Disediakan', 0, 'Tidak', 'Susu, gula dan teh disediakan di kiosk (stok dipantau staf)'],
  ['Lain-lain', 1, 'Ya', '']
];
 
// Nama kategori versi awal sistem → nama baharu
const KATEGORI_LAMA = {
  'Mi Segera (Pek)': 'Maggi (Paket)', 'Mi Segera (Cup)': 'Maggi Cup', 'Biskut': 'Biskut Lain',
  'School Pack': 'Cereal', 'Minuman Kotak': 'Air Kotak'
};
 
const TETAPAN_ASAL = [
  ['HAD_ITEM_SEKALI', 5, 'Jumlah item maksimum bagi setiap ambilan (selain had setiap kategori). Isi 0 untuk tiada had keseluruhan'],
  ['WAKTU_OPERASI', '10:00-14:00, 18:30-20:30', 'Waktu kiosk dibuka setiap hari. Pelajar hanya boleh merekod ambilan dalam waktu ini'],
  ['SELANG_HARI', 3, 'Bilangan hari antara dua ambilan. 3 = ambil hari Isnin, boleh ambil semula hari Khamis'],
  ['HAD_SEMINGGU', 3, 'Bilangan ambilan maksimum dalam seminggu (Isnin hingga Ahad)'],
  ['DOMAIN_EMEL', '', 'Hadkan log masuk pelajar kepada domain tertentu, cth: pkk.edu.my. Kosongkan untuk benarkan semua e-mel'],
  ['LOGO_DRIVE', '', 'Pilihan: pautan fail logo lain dalam Google Drive. Kosongkan untuk guna logo JPP yang sudah terbina dalam sistem'],
  ['NAMA_SHEET_BORANG', '', 'Nama tab respons Google Form. Kosongkan untuk dikesan automatik'],
  ['NAMA_PENGIRIM_EMEL', 'Food Bank JPP PKK', 'Nama pengirim e-mel kod log masuk']
];
 
// Barang permulaan mengikut poster. Kemas kini dalam tab Stok mengikut barang sebenar.
const STOK_ASAL = [
  ['Maggi Kari (paket)', 'Maggi (Paket)', 'paket', 20],
  ['Maggi Tom Yam (paket)', 'Maggi (Paket)', 'paket', 20],
  ['Maggi Hot Cup Asam Laksa', 'Maggi Cup', 'cawan', 20],
  ['Maggi Cup Tom Yam', 'Maggi Cup', 'cawan', 20],
  ['Maggi Cup Kari', 'Maggi Cup', 'cawan', 20],
  ['Nescafé 3 in 1', '3 In 1', 'sachet', 30],
  ['Milo 3 in 1', '3 In 1', 'sachet', 30],
  ['Nestum 3 in 1', '3 In 1', 'sachet', 30],
  ['Hup Seng Cream Crackers', 'Biskut Hup Seng', 'paket', 15],
  ['Hup Seng Sugar Crackers', 'Biskut Hup Seng', 'paket', 15],
  ['Oreo', 'Biskut Lain', 'paket', 15],
  ['Chipsmore', 'Biskut Lain', 'paket', 15],
  ['Lexus', 'Biskut Lain', 'paket', 15],
  ['Marie', 'Biskut Lain', 'paket', 15],
  ["Munchy's Oat Krunch", 'Biskut Lain', 'paket', 15],
  ["Munchy's Chocolate", 'Biskut Lain', 'paket', 15],
  ['Sardin King Cup', 'Makanan Tin', 'tin', 10],
  ["Yeo's Kari Ayam", 'Makanan Tin', 'tin', 10],
  ['Milo Cereal', 'Cereal', 'kotak', 10],
  ['Honey Stars', 'Cereal', 'kotak', 10],
  ['Koko Krunch', 'Cereal', 'kotak', 10],
  ['Air Kotak Seasons (pelbagai perisa)', 'Air Kotak', 'kotak', 24],
  ['Nabati Wafer Coklat', 'Nabati', 'paket', 20],
  ['Nabati Wafer Keju', 'Nabati', 'paket', 20],
  ['Susu UHT', 'Turut Disediakan', 'kotak', 5],
  ['Gula', 'Turut Disediakan', 'paket', 3],
  ['Teh', 'Turut Disediakan', 'kotak', 3]
];
 
/* =====================================================================
 *  PEMASANGAN & MENU
 * ===================================================================== */
 
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Food Bank JPP')
    .addItem('Pasang / baiki tab sistem', 'pasang')
    .addItem('Tunjuk pautan sistem', 'tunjukPautan')
    .addToUi();
}
 
/** Jalankan sekali dari editor Apps Script. Selamat dijalankan semula. */
function pasang() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  rahsia_();
 
  Object.keys(HEAD).forEach(function (nama) {
    let s = ss.getSheetByName(nama);
    if (!s) s = ss.insertSheet(nama);
    if (s.getLastRow() === 0) {
      s.getRange(1, 1, 1, HEAD[nama].length).setValues([HEAD[nama]])
        .setFontWeight('bold').setBackground('#14213D').setFontColor('#FFFFFF');
      s.setFrozenRows(1);
    }
  });
 
  const tet = ss.getSheetByName(SH.TETAPAN);
  const adaKunci = tet.getDataRange().getValues().map(function (r) { return String(r[0]); });
  const baru = TETAPAN_ASAL.filter(function (r) { return adaKunci.indexOf(r[0]) < 0; });
  if (baru.length) appendRows_(SH.TETAPAN, baru);
 
  if (ss.getSheetByName(SH.HAD).getLastRow() < 2) appendRows_(SH.HAD, HAD_ASAL);
 
  // Tukar nama kategori versi awal (jika ada)
  const stokSh = ss.getSheetByName(SH.STOK);
  if (stokSh.getLastRow() > 1) {
    const kol = stokSh.getRange(2, 3, stokSh.getLastRow() - 1, 1).getValues();
    let ubah = false;
    kol.forEach(function (r) { if (KATEGORI_LAMA[r[0]]) { r[0] = KATEGORI_LAMA[r[0]]; ubah = true; } });
    if (ubah) stokSh.getRange(2, 3, kol.length, 1).setValues(kol);
  }
 
  const staf = ss.getSheetByName(SH.STAF);
  if (staf.getLastRow() < 2) {
    appendRows_(SH.STAF, [[Session.getEffectiveUser().getEmail(), 'Pemilik sistem', 'Pentadbir']]);
  }
 
  const stok = ss.getSheetByName(SH.STOK);
  if (stok.getLastRow() < 2) {
    const now = new Date();
    appendRows_(SH.STOK, STOK_ASAL.map(function (r) {
      return [idBaru_('I'), r[0], r[1], r[2], '', r[3], '', '', now];
    }));
  }
 
  const borang = sheetBorang_();
  const mesej = 'Sistem dipasang.\n\nTab respons borang: ' + (borang ? '"' + borang.getName() + '"' : 'TIDAK DIJUMPAI — isi NAMA_SHEET_BORANG dalam tab Tetapan') +
    '\n\nLangkah seterusnya: tambah e-mel staf JPP dalam tab "Staf", kemudian Deploy → New deployment → Web app.';
  Logger.log(mesej);
  return mesej;
}
 
function tunjukPautan() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Pautan sistem:\n' + url : 'Sistem belum di-deploy. Deploy → New deployment → Web app.');
}
 
/* =====================================================================
 *  HALAMAN WEB
 * ===================================================================== */
 
function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.logo = logoDataUri_();
  return t.evaluate()
    .setTitle('Food Bank Siswa · JPP PKK')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
 
function logoDataUri_() {
  try {
    const raw = String(tetapan_().LOGO_DRIVE || '').trim();
    if (!raw) return '';
    const m = raw.match(/[-\w]{25,}/);
    if (!m) return '';
    const cache = CacheService.getScriptCache();
    const kunci = 'logo_' + m[0];
    const ada = cache.get(kunci);
    if (ada) return ada;
    const blob = DriveApp.getFileById(m[0]).getBlob();
    const uri = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    if (uri.length < 95000) cache.put(kunci, uri, 21600);
    return uri;
  } catch (e) {
    return '';
  }
}
 
/* =====================================================================
 *  LOG MASUK (kod 6 digit dihantar ke e-mel)
 * ===================================================================== */
 
function mintaKod(emailMentah) {
  const email = normEmail_(emailMentah);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Alamat e-mel tidak sah.');
  const t = tetapan_();
  const domain = String(t.DOMAIN_EMEL || '').trim().toLowerCase().replace(/^@/, '');
  if (domain && !email.endsWith('@' + domain) && !infoStaf_(email)) {
    throw new Error('Sila log masuk dengan e-mel @' + domain + '.');
  }
  const c = CacheService.getScriptCache();
  if (c.get('otpw_' + email)) throw new Error('Kod baru sahaja dihantar. Tunggu 1 minit sebelum minta semula.');
  const n = Number(c.get('otpn_' + email) || 0);
  if (n >= 5) throw new Error('Terlalu banyak permintaan kod. Cuba lagi dalam 1 jam.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Had e-mel harian sistem telah habis. Cuba lagi esok atau hubungi JPP.');
 
  const kod = String(100000 + Math.floor(Math.random() * 900000));
  c.put('otp_' + email, JSON.stringify({ h: cincang_(kod + '|' + email), a: 0 }), 600);
  c.put('otpw_' + email, '1', 60);
  c.put('otpn_' + email, String(n + 1), 3600);
 
  MailApp.sendEmail({
    to: email,
    name: t.NAMA_PENGIRIM_EMEL || 'Food Bank JPP PKK',
    subject: kod + ' ialah kod log masuk Food Bank JPP',
    body: 'Kod log masuk anda: ' + kod + '\n\nKod ini sah selama 10 minit. Jika anda tidak meminta kod ini, abaikan e-mel ini.\n\nJawatankuasa Perwakilan Pelajar, Politeknik Kota Kinabalu',
    htmlBody: '<div style="font-family:Arial,sans-serif;max-width:420px">' +
      '<p style="color:#5A6478;margin:0 0 8px">Food Bank Siswa · JPP Politeknik Kota Kinabalu</p>' +
      '<p style="margin:0 0 12px">Kod log masuk anda:</p>' +
      '<p style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:0 0 12px;color:#14213D">' + kod + '</p>' +
      '<p style="color:#5A6478;font-size:13px">Kod ini sah selama 10 minit. Jika anda tidak meminta kod ini, abaikan e-mel ini.</p></div>'
  });
  return { ok: true };
}
 
function sahkanKod(emailMentah, kodMentah) {
  const email = normEmail_(emailMentah);
  const kod = String(kodMentah || '').replace(/\D/g, '');
  const c = CacheService.getScriptCache();
  const rec = JSON.parse(c.get('otp_' + email) || 'null');
  if (!rec) throw new Error('Kod telah tamat tempoh. Minta kod baharu.');
  if (rec.a >= 5) {
    c.remove('otp_' + email);
    throw new Error('Terlalu banyak cubaan salah. Minta kod baharu.');
  }
  if (rec.h !== cincang_(kod + '|' + email)) {
    rec.a++;
    c.put('otp_' + email, JSON.stringify(rec), 600);
    throw new Error('Kod salah. Semak e-mel anda dan cuba lagi.');
  }
  c.remove('otp_' + email);
  return { token: buatToken_(email) };
}
 
/* =====================================================================
 *  DATA UTAMA (dipanggil selepas log masuk)
 * ===================================================================== */
 
function muatData(token) {
  const email = semakToken_(token);
  const t = tetapan_();
  const staf = infoStaf_(email);
  const profil = profil_(email);
  const semua = semuaAmbilan_();
  const milikSaya = semua.filter(function (a) { return milik_(a, email, profil && profil.matriks); });
  const K = kategori_();
  const stok = stokSemua_(K);
 
  const out = {
    saya: {
      email: email,
      staf: !!staf,
      namaStaf: staf ? staf.nama : '',
      jawatan: staf ? staf.jawatan : '',
      profil: profil,
      cadangan: profil ? null : cadanganProfil_(email, semua)
    },
    tetapan: { hadItem: t.HAD_ITEM_SEKALI, selang: t.SELANG_HARI, hadSeminggu: t.HAD_SEMINGGU },
    kategori: K.senarai,
    had: K,
    kiosk: waktuKiosk_(t),
    hariIni: kunciTarikh_(new Date()),
    kelayakan: kelayakan_(milikSaya, t),
    sejarah: milikSaya.slice(0, 20).map(sirialAmbilan_),
    stok: stok.filter(function (i) { return staf || ((i.stok || 0) > 0 && bolehDiambil_(K, i.kategori)); }).map(function (i) {
      return staf ? i : { id: i.id, nama: i.nama, kategori: i.kategori, unit: i.unit, stok: i.stok };
    })
  };
  if (staf) out.urus = dataStaf_(semua, stok, t);
  return out;
}
 
function simpanProfil(token, p) {
  const email = semakToken_(token);
  return simpanProfilUntuk_(email, p, token);
}
 
function simpanProfilUntuk_(email, p, token) {
  p = p || {};
  const nama = String(p.nama || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const matriks = normMatriks_(p.matriks);
  const telefon = String(p.telefon || '').trim();
  if (nama.length < 3) throw new Error('Isi nama penuh.');
  if (matriks.length < 5) throw new Error('Isi nombor kad matriks yang sah.');
  if (!/^[0-9+\-\s]{9,15}$/.test(telefon)) throw new Error('Isi nombor telefon yang sah, cth: 012-3456789.');
 
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SH.PELAJAR);
    const v = sh.getDataRange().getValues();
    let baris = -1;
    for (let i = 1; i < v.length; i++) {
      const e = normEmail_(v[i][0]);
      if (e === email) baris = i;
      else if (normMatriks_(v[i][2]) === matriks) {
        throw new Error('No. matriks ini sudah didaftarkan dengan e-mel lain. Hubungi JPP jika ini kesilapan.');
      }
    }
    if (baris >= 0) {
      sh.getRange(baris + 1, 2, 1, 3).setValues([[nama, matriks, "'" + telefon]]);
    } else {
      appendRows_(SH.PELAJAR, [[email, nama, matriks, "'" + telefon, new Date()]]);
    }
  } finally {
    lock.releaseLock();
  }
  return token ? muatData(token) : null;
}
 
/* =====================================================================
 *  AMBILAN BARANG
 * ===================================================================== */
 
/**
 * pilihan: [{id, qty}]   untukEmail: hanya staf (rekod bagi pihak pelajar)
 */
function kiraItemKategori_(kategori, kuantiti) {
  const qty = Math.max(0, Math.floor(Number(kuantiti) || 0));
  const kat = String(kategori || '').trim().toLowerCase();

  // Kira jumlah terkumpul dalam kategori: 2 paket Maggi = 1 item,
  // dan 2 sachet 3 In 1 = 1 item. Stok fizikal tetap ditolak ikut qty sebenar.
  if (kat === 'maggi (paket)' || kat === '3 in 1') {
    return Math.ceil(qty / 2);
  }

  return qty;
}

function buatAmbilan(token, pilihan, ulasan, untukEmail) {
  const email = semakToken_(token);
  const staf = infoStaf_(email);
  let sasaran = email;
  if (untukEmail) {
    if (!staf) throw new Error('Hanya staf JPP boleh merekod ambilan untuk pelajar lain.');
    sasaran = normEmail_(untukEmail);
  }
  let profil = profil_(sasaran);
  if (!profil && untukEmail) {
    // Pelajar yang hanya ada rekod Google Form: daftarkan profil daripada rekod borang terkini
    const c = cadanganProfil_(sasaran, semuaAmbilan_());
    if (c && c.nama && c.matriks) {
      try {
        simpanProfilUntuk_(sasaran, { nama: c.nama, matriks: c.matriks, telefon: String(c.telefon || '').replace(/[^0-9+\-\s]/g, '') || '0000000000' }, null);
      } catch (e) { /* tidak dapat didaftarkan automatik */ }
      profil = profil_(sasaran);
    }
  }
  if (!profil) throw new Error(untukEmail ? 'Pelajar ini belum melengkapkan profil dalam sistem.' : 'Lengkapkan profil anda dahulu.');
  const t = tetapan_();
 
  const gabung = {};
  (pilihan || []).forEach(function (p) {
    const q = Math.floor(Number(p && p.qty));
    if (p && p.id && q > 0) gabung[String(p.id)] = (gabung[String(p.id)] || 0) + q;
  });
  const items = Object.keys(gabung).map(function (id) { return { id: id, qty: gabung[id] }; });
  if (!items.length) throw new Error('Pilih sekurang-kurangnya satu barang.');
  if (!untukEmail) {
    const w = waktuKiosk_(t);
    if (!w.buka) throw new Error('Kiosk tutup sekarang. Dibuka semula ' + w.seterusnya + '.');
  }
  const K = kategori_();
 
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let hasil;
  try {
    const milik = semuaAmbilan_().filter(function (a) { return milik_(a, sasaran, profil.matriks); });
    const k = kelayakan_(milik, t);
    if (!k.boleh) throw new Error('Belum layak. Ambilan seterusnya pada ' + paparTarikh_(k.seterusnya) + '.');
 
    const sh = sheet_(SH.STOK);
    const v = sh.getDataRange().getValues();
    const indeks = {};
    for (let i = 1; i < v.length; i++) indeks[String(v[i][0])] = i;
    const kuantitiMentah = {};
    items.forEach(function (p) {
      const i = indeks[p.id];
      if (i === undefined) throw new Error('Barang tidak dijumpai. Muat semula halaman.');
      const s = Number(v[i][4]) || 0;
      if (p.qty > s) throw new Error(v[i][1] + ' tinggal ' + s + ' sahaja.');
      const kat = K.senarai.indexOf(String(v[i][2])) >= 0 ? String(v[i][2]) : 'Lain-lain';
      kuantitiMentah[kat] = (kuantitiMentah[kat] || 0) + p.qty;
    });

    // Normalisasi selepas menggabungkan semua barang dalam kategori yang sama.
    // Contoh: 1 Maggi Kari + 1 Maggi Tom Yam = 2 paket = 1 item dikira.
    const kiraan = {};
    Object.keys(kuantitiMentah).forEach(function (kat) {
      kiraan[kat] = kiraItemKategori_(kat, kuantitiMentah[kat]);
    });
    const jumlah = Object.keys(kiraan).reduce(function (s, kat) { return s + kiraan[kat]; }, 0);
    if (t.HAD_ITEM_SEKALI > 0 && jumlah > t.HAD_ITEM_SEKALI) {
      throw new Error('Maksimum ' + t.HAD_ITEM_SEKALI + ' item dikira bagi setiap ambilan.');
    }
    const salah = semakHad_(kiraan, K);
    if (salah) throw new Error(salah);
 
    const now = new Date();
    const id = idBaru_('A');
    const logRows = [];
    const teks = [];
    items.forEach(function (p) {
      const i = indeks[p.id];
      const s = Number(v[i][4]) || 0;
      sh.getRange(i + 1, 5).setValue(s - p.qty);
      sh.getRange(i + 1, 9).setValue(now);
      logRows.push([now, 'Ambilan', p.id, v[i][1], p.qty, s, s - p.qty, sasaran, 'Ambilan ' + id]);
      teks.push(p.qty + ' × ' + v[i][1]);
    });
    appendRows_(SH.LOG, logRows);
    appendRows_(SH.AMBIL, [[now, sasaran, profil.nama, profil.matriks, teks.join(', '), jumlah,
      String(ulasan || '').slice(0, 500), untukEmail ? email : 'Sendiri', id]]);
    SpreadsheetApp.flush();
    hasil = { id: id, masa: now.toISOString(), barang: teks, jumlah: jumlah, nama: profil.nama, matriks: profil.matriks };
  } finally {
    lock.releaseLock();
  }
  return { resit: hasil, data: muatData(token) };
}
 
/* =====================================================================
 *  URUS STOK (staf sahaja)
 * ===================================================================== */
 
function transaksiStok(token, id, jenis, qty, catatan, luput) {
  const email = pastikanStaf_(token);
  qty = Math.floor(Number(qty));
  if (['Masuk', 'Keluar', 'Kiraan'].indexOf(jenis) < 0) throw new Error('Jenis transaksi tidak sah.');
  if (!(qty >= 0) || (jenis !== 'Kiraan' && qty === 0)) throw new Error('Masukkan kuantiti yang sah.');
 
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SH.STOK);
    const v = sh.getDataRange().getValues();
    let i = -1;
    for (let r = 1; r < v.length; r++) if (String(v[r][0]) === String(id)) i = r;
    if (i < 0) throw new Error('Item tidak dijumpai. Muat semula halaman.');
    const sebelum = Number(v[i][4]) || 0;
    let selepas = jenis === 'Masuk' ? sebelum + qty : jenis === 'Keluar' ? sebelum - qty : qty;
    if (selepas < 0) throw new Error('Stok hanya ' + sebelum + '. Kurangkan kuantiti.');
    const now = new Date();
    sh.getRange(i + 1, 5).setValue(selepas);
    sh.getRange(i + 1, 9).setValue(now);
    if (jenis === 'Masuk' && luput !== undefined && luput !== null) sh.getRange(i + 1, 8).setValue(luput ? tarikhDariKunci_(luput) : '');
    appendRows_(SH.LOG, [[now, jenis, id, v[i][1], qty, sebelum, selepas, email, String(catatan || '').slice(0, 300)]]);
  } finally {
    lock.releaseLock();
  }
  return muatData(token);
}
 
function simpanItem(token, item) {
  const email = pastikanStaf_(token);
  item = item || {};
  const nama = String(item.nama || '').trim();
  if (!nama) throw new Error('Nama item diperlukan.');
  const kategori = kategori_().senarai.indexOf(item.kategori) >= 0 ? item.kategori : 'Lain-lain';
  const unit = String(item.unit || 'unit').trim().slice(0, 20);
  const min = Math.max(0, Math.floor(Number(item.min) || 0));
  const lokasi = String(item.lokasi || '').trim().slice(0, 40);
  const luput = item.luput ? tarikhDariKunci_(item.luput) : '';
 
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SH.STOK);
    const v = sh.getDataRange().getValues();
    const now = new Date();
    for (let r = 1; r < v.length; r++) {
      if (String(v[r][0]) !== String(item.id) && String(v[r][1]).trim().toLowerCase() === nama.toLowerCase()) {
        throw new Error('"' + v[r][1] + '" sudah ada dalam inventori.');
      }
    }
    if (item.id) {
      let i = -1;
      for (let r = 1; r < v.length; r++) if (String(v[r][0]) === String(item.id)) i = r;
      if (i < 0) throw new Error('Item tidak dijumpai.');
      sh.getRange(i + 1, 2, 1, 3).setValues([[nama, kategori, unit]]);
      sh.getRange(i + 1, 6, 1, 4).setValues([[min, lokasi, luput, now]]);
    } else {
      const awalMentah = item.stokAwal;
      const awal = awalMentah === '' || awalMentah === null || awalMentah === undefined ? '' : Math.max(0, Math.floor(Number(awalMentah) || 0));
      const id = idBaru_('I');
      appendRows_(SH.STOK, [[id, nama, kategori, unit, awal, min, lokasi, luput, now]]);
      if (awal !== '' && awal > 0) appendRows_(SH.LOG, [[now, 'Masuk', id, nama, awal, 0, awal, email, 'Stok awal']]);
    }
  } finally {
    lock.releaseLock();
  }
  return muatData(token);
}
 
function padamItem(token, id) {
  const email = pastikanStaf_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(SH.STOK);
    const v = sh.getDataRange().getValues();
    for (let r = v.length - 1; r >= 1; r--) {
      if (String(v[r][0]) === String(id)) {
        sh.deleteRow(r + 1);
        appendRows_(SH.LOG, [[new Date(), 'Padam', id, v[r][1], 0, Number(v[r][4]) || 0, 0, email, 'Item dipadam']]);
        break;
      }
    }
  } finally {
    lock.releaseLock();
  }
  return muatData(token);
}
 
/* =====================================================================
 *  DATA UNTUK STAF
 * ===================================================================== */
 
function dataStaf_(semua, stok, t) {
  const hariIni = kunciTarikh_(new Date());
  const idxHariIni = indeksHari_(hariIni);
 
  // Kumpul pelajar daripada profil + rekod ambilan (sistem & borang)
  const peta = {};
  function kunciOrang(email, matriks) { return email ? 'E:' + email : 'M:' + matriks; }
  const profilSemua = rows_(SH.PELAJAR).map(function (r) {
    return { email: normEmail_(r[0]), nama: String(r[1] || ''), matriks: normMatriks_(r[2]), telefon: String(r[3] || '') };
  }).filter(function (p) { return p.email; });
  const ikutMatriks = {};
  profilSemua.forEach(function (p) {
    peta['E:' + p.email] = { email: p.email, nama: p.nama, matriks: p.matriks, telefon: p.telefon, profil: true, ambilan: [] };
    if (p.matriks) ikutMatriks[p.matriks] = 'E:' + p.email;
  });
  semua.forEach(function (a) {
    let k = a.email && peta['E:' + a.email] ? 'E:' + a.email : (a.matriks && ikutMatriks[a.matriks]) || kunciOrang(a.email, a.matriks);
    if (!a.email && !a.matriks) return;
    if (!peta[k]) {
      peta[k] = { email: a.email, nama: a.nama, matriks: a.matriks, telefon: a.telefon || '', profil: false, ambilan: [] };
      if (a.matriks && !ikutMatriks[a.matriks]) ikutMatriks[a.matriks] = k;
    }
    const o = peta[k];
    if (!o.nama && a.nama) o.nama = a.nama;
    if (!o.matriks && a.matriks) o.matriks = a.matriks;
    if (!o.telefon && a.telefon) o.telefon = a.telefon;
    o.ambilan.push(a);
  });
  const pelajar = Object.keys(peta).map(function (k) {
    const o = peta[k];
    const kl = kelayakan_(o.ambilan, t);
    const hari30 = {};
    o.ambilan.forEach(function (a) {
      const d = indeksHari_(kunciTarikh_(a.t));
      if (idxHariIni - d < 30) hari30[d] = 1;
    });
    return {
      email: o.email || '', nama: o.nama || '', matriks: o.matriks || '', telefon: o.telefon || '',
      profil: o.profil, terakhir: kl.terakhir, seterusnya: kl.seterusnya, boleh: kl.boleh,
      bil30: Object.keys(hari30).length, jumlah: o.ambilan.length
    };
  }).sort(function (a, b) { return String(b.terakhir || '').localeCompare(String(a.terakhir || '')) || a.nama.localeCompare(b.nama); });
 
  const hariIniAmbil = semua.filter(function (a) { return kunciTarikh_(a.t) === hariIni; });
  const itemKeluar = hariIniAmbil.reduce(function (s, a) { return s + (Number(a.jumlah) || 0); }, 0);
 
  const log = rows_(SH.LOG).filter(function (r) { return r[0] instanceof Date; }).map(function (r) {
    return { masa: r[0].toISOString(), jenis: String(r[1]), item: String(r[3]), qty: Number(r[4]) || 0,
      sebelum: Number(r[5]) || 0, selepas: Number(r[6]) || 0, oleh: String(r[7] || ''), catatan: String(r[8] || '') };
  }).reverse().slice(0, 300);
 
  return {
    ringkasan: {
      ambilanHariIni: hariIniAmbil.length,
      itemKeluarHariIni: itemKeluar,
      pelajarBerdaftar: profilSemua.length,
      sumberBorang: !!sheetBorang_()
    },
    ambilan: semua.slice(0, 300).map(sirialAmbilan_),
    pelajar: pelajar,
    log: log
  };
}
 
/* =====================================================================
 *  KELAYAKAN
 * ===================================================================== */
 
function kelayakan_(senarai, t) {
  const hari = indeksHari_(kunciTarikh_(new Date()));
  const isnin = hari - ((hari + 3) % 7); // 1 Jan 1970 ialah hari Khamis
  const unik = {};
  senarai.forEach(function (a) { unik[indeksHari_(kunciTarikh_(a.t))] = 1; });
  const hariAmbil = Object.keys(unik).map(Number).sort(function (a, b) { return b - a; });
  const akhir = hariAmbil.length ? hariAmbil[0] : null;
  const mingguIni = hariAmbil.filter(function (d) { return d >= isnin && d <= isnin + 6; }).length;
  const selang = Math.max(0, Number(t.SELANG_HARI) || 0);
  const hadSeminggu = Math.max(1, Number(t.HAD_SEMINGGU) || 1);
  let seterusnya = akhir === null ? hari : akhir + selang;
  if (mingguIni >= hadSeminggu) seterusnya = Math.max(seterusnya, isnin + 7);
  return {
    boleh: seterusnya <= hari,
    terakhir: akhir === null ? null : kunciDariIndeks_(akhir),
    seterusnya: kunciDariIndeks_(Math.max(seterusnya, hari)),
    lagiHari: Math.max(0, seterusnya - hari),
    mingguIni: mingguIni,
    hadSeminggu: hadSeminggu,
    selang: selang,
    hadItem: Number(t.HAD_ITEM_SEKALI) || 0
  };
}
 
/* =====================================================================
 *  HAD KATEGORI & WAKTU OPERASI
 * ===================================================================== */
 
function kategori_() {
  const baris = rows_(SH.HAD).filter(function (r) { return String(r[0] || '').trim(); });
  const out = { senarai: [], had: {}, kumpulan: [] };
  (baris.length ? baris : HAD_ASAL).forEach(function (r) {
    const nama = String(r[0]).trim();
    const had = r[1] === '' || r[1] === null ? null : Math.max(0, Math.floor(Number(r[1]) || 0));
    const ket = String(r[3] || '');
    if (nama.indexOf('+') >= 0) {
      out.kumpulan.push({ kategori: nama.split('+').map(function (x) { return x.trim(); }), had: had, ket: ket });
    } else if (!out.had[nama]) {
      out.senarai.push(nama);
      out.had[nama] = { had: had, papar: !/^(tidak|no|t|n)$/i.test(String(r[2] || '').trim()), ket: ket };
    }
  });
  if (!out.had['Lain-lain']) {
    out.senarai.push('Lain-lain');
    out.had['Lain-lain'] = { had: null, papar: true, ket: '' };
  }
  return out;
}
 
function bolehDiambil_(K, kat) {
  const h = K.had[kat] || K.had['Lain-lain'];
  return h.papar && h.had !== 0;
}
 
/** kiraan: {kategori: jumlah}. Pulangkan mesej ralat, atau '' jika mematuhi had. */
function semakHad_(kiraan, K) {
  const kat = Object.keys(kiraan);
  for (let i = 0; i < kat.length; i++) {
    const h = K.had[kat[i]] || K.had['Lain-lain'];
    if (!bolehDiambil_(K, kat[i])) return 'Barang kategori ' + kat[i] + ' tidak diambil melalui sistem.';
    if (h.had !== null && kiraan[kat[i]] > h.had) return kat[i] + ': ' + (h.ket || 'maksimum ' + h.had) + '.';
  }
  for (let j = 0; j < K.kumpulan.length; j++) {
    const g = K.kumpulan[j];
    const n = g.kategori.reduce(function (s, c) { return s + (kiraan[c] || 0); }, 0);
    if (g.had !== null && n > g.had) return (g.ket || g.kategori.join(' + ') + ': maksimum ' + g.had) + '.';
  }
  return '';
}
 
function waktuKiosk_(t) {
  const sesi = [];
  String(t.WAKTU_OPERASI || '').split(',').forEach(function (b) {
    const m = b.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
    if (m) sesi.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  });
  if (!sesi.length) return { buka: true, sesi: [], seterusnya: '' };
  sesi.sort(function (a, b) { return a[0] - b[0]; });
  const hm = Utilities.formatDate(new Date(), TZ, 'HH:mm').split(':');
  const kini = Number(hm[0]) * 60 + Number(hm[1]);
  const buka = sesi.some(function (s) { return kini >= s[0] && kini < s[1]; });
  let seterusnya = '';
  if (!buka) {
    const s = sesi.filter(function (x) { return x[0] > kini; })[0];
    seterusnya = s ? 'hari ini, ' + jam_(s[0]) : 'esok, ' + jam_(sesi[0][0]);
  }
  return { buka: buka, seterusnya: seterusnya, sesi: sesi.map(function (s) { return jam_(s[0]) + ' – ' + jam_(s[1]); }) };
}
 
function jam_(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  const label = h < 12 ? 'pagi' : h < 14 ? 'tengah hari' : h < 19 ? 'petang' : 'malam';
  return ((h % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + label;
}
 
/* =====================================================================
 *  SUMBER DATA
 * ===================================================================== */
 
function semuaAmbilan_() {
  const sistem = rows_(SH.AMBIL).filter(function (r) { return r[0] instanceof Date; }).map(function (r) {
    return { t: r[0], email: normEmail_(r[1]), nama: String(r[2] || ''), matriks: normMatriks_(r[3]), telefon: '',
      barang: String(r[4] || ''), jumlah: Number(r[5]) || 0, ulasan: String(r[6] || ''),
      oleh: String(r[7] || ''), id: String(r[8] || ''), sumber: 'Sistem' };
  });
  return sistem.concat(ambilanBorang_()).sort(function (a, b) { return b.t - a.t; });
}
 
function sheetBorang_() {
  const ss = ss_();
  const t = tetapan_();
  if (t.NAMA_SHEET_BORANG) return ss.getSheetByName(String(t.NAMA_SHEET_BORANG));
  const milikSistem = Object.keys(HEAD);
  const semua = ss.getSheets();
  for (let i = 0; i < semua.length; i++) {
    const s = semua[i];
    if (milikSistem.indexOf(s.getName()) >= 0) continue;
    const lc = s.getLastColumn();
    if (!lc) continue;
    const h = s.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).toLowerCase(); });
    if (h.some(function (x) { return x.indexOf('matrik') >= 0; })) return s;
  }
  return null;
}
 
function ambilanBorang_() {
  const s = sheetBorang_();
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getDataRange().getValues();
  const h = v.shift().map(function (x) { return String(x).toLowerCase(); });
  function cari(f) { for (let i = 0; i < h.length; i++) if (f(h[i])) return i; return -1; }
  let iT = cari(function (x) { return x.indexOf('timestamp') >= 0 || x.indexOf('cap masa') >= 0 || x.indexOf('tarikh') >= 0; });
  if (iT < 0) iT = 0;
  const iE = cari(function (x) { return x.indexOf('email') >= 0 || x.indexOf('e-mel') >= 0 || x.indexOf('emel') >= 0; });
  const iN = cari(function (x) { return x.indexOf('nama') >= 0; });
  const iM = cari(function (x) { return x.indexOf('matrik') >= 0; });
  const iP = cari(function (x) { return x.indexOf('telefon') >= 0; });
  const iB = cari(function (x) { return x.indexOf('barang') >= 0 || x.indexOf('makanan') >= 0; });
  const iU = cari(function (x) { return x.indexOf('ulasan') >= 0; });
  function ambil(r, i) { return i >= 0 ? String(r[i] || '').trim() : ''; }
  return v.filter(function (r) { return r[iT] instanceof Date; }).map(function (r) {
    const barang = ambil(r, iB);
    return { t: r[iT], email: normEmail_(ambil(r, iE)), nama: ambil(r, iN).toUpperCase(), matriks: normMatriks_(ambil(r, iM)),
      telefon: ambil(r, iP), barang: barang, jumlah: barang ? barang.split(/,(?![^()]*\))/).length : 0, ulasan: ambil(r, iU),
      oleh: 'Google Form', id: '', sumber: 'Borang' };
  });
}
 
function stokSemua_(K) {
  K = K || kategori_();
  const sh = sheet_(SH.STOK);
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!String(r[1] || '').trim()) continue;
    if (!String(r[0] || '').trim()) {
      r[0] = idBaru_('I');
      sh.getRange(i + 1, 1).setValue(r[0]); // item ditambah terus dalam sheet
    }
    out.push({
      id: String(r[0]), nama: String(r[1]).trim(), kategori: K.senarai.indexOf(String(r[2])) >= 0 ? String(r[2]) : 'Lain-lain',
      unit: String(r[3] || 'unit'), stok: r[4] === '' || r[4] === null ? null : Number(r[4]) || 0,
      min: Number(r[5]) || 0, lokasi: String(r[6] || ''),
      luput: r[7] instanceof Date ? kunciTarikh_(r[7]) : String(r[7] || ''),
      dikemaskini: r[8] instanceof Date ? r[8].toISOString() : ''
    });
  }
  return out;
}
 
function profil_(email) {
  const v = rows_(SH.PELAJAR);
  for (let i = 0; i < v.length; i++) {
    if (normEmail_(v[i][0]) === email) {
      return { nama: String(v[i][1] || ''), matriks: normMatriks_(v[i][2]), telefon: String(v[i][3] || '') };
    }
  }
  return null;
}
 
function cadanganProfil_(email, semua) {
  for (let i = 0; i < semua.length; i++) {
    const a = semua[i];
    if (a.email === email && a.sumber === 'Borang') return { nama: a.nama, matriks: a.matriks, telefon: a.telefon };
  }
  return null;
}
 
function milik_(a, email, matriks) {
  return (a.email && a.email === email) || (!!matriks && a.matriks === matriks);
}
 
function infoStaf_(email) {
  if (!email) return null;
  if (email === normEmail_(Session.getEffectiveUser().getEmail())) return { nama: 'Pemilik sistem', jawatan: 'Pentadbir' };
  const v = rows_(SH.STAF);
  for (let i = 0; i < v.length; i++) {
    if (normEmail_(v[i][0]) === email) return { nama: String(v[i][1] || ''), jawatan: String(v[i][2] || 'Staf JPP') };
  }
  return null;
}
 
function pastikanStaf_(token) {
  const email = semakToken_(token);
  if (!infoStaf_(email)) throw new Error('Akses ini untuk staf JPP sahaja.');
  return email;
}
 
function tetapan_() {
  const t = {};
  TETAPAN_ASAL.forEach(function (r) { t[r[0]] = r[1]; });
  const s = ss_().getSheetByName(SH.TETAPAN);
  if (s) {
    s.getDataRange().getValues().slice(1).forEach(function (r) {
      const k = String(r[0] || '').trim();
      if (k) t[k] = r[1];
    });
  }
  ['HAD_ITEM_SEKALI', 'SELANG_HARI', 'HAD_SEMINGGU'].forEach(function (k) {
    const n = Number(t[k]);
    t[k] = isNaN(n) || t[k] === '' ? TETAPAN_ASAL.filter(function (r) { return r[0] === k; })[0][1] : n;
  });
  return t;
}
 
/* =====================================================================
 *  TOKEN SESI (ditandatangani HMAC, sah 30 hari)
 * ===================================================================== */
 
function rahsia_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('RAHSIA');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty('RAHSIA', s);
  }
  return s;
}
 
function tandatangan_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, rahsia_())).replace(/=+$/, '');
}
 
function cincang_(s) {
  return tandatangan_('otp|' + s);
}
 
function buatToken_(email) {
  const badan = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, x: Date.now() + 30 * 864e5 }), Utilities.Charset.UTF_8).replace(/=+$/, '');
  return badan + '.' + tandatangan_(badan);
}
 
function semakToken_(token) {
  if (typeof token !== 'string' || token.indexOf('.') < 0) throw new Error('SESI_TAMAT');
  const bahagian = token.split('.');
  if (bahagian.length !== 2 || tandatangan_(bahagian[0]) !== bahagian[1]) throw new Error('SESI_TAMAT');
  const b = bahagian[0] + '==='.slice((bahagian[0].length + 3) % 4);
  let d;
  try {
    d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString());
  } catch (e) {
    throw new Error('SESI_TAMAT');
  }
  if (!d || !d.e || !(d.x > Date.now())) throw new Error('SESI_TAMAT');
  return d.e;
}
 
/* =====================================================================
 *  UTILITI
 * ===================================================================== */
 
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
 
function sheet_(nama) {
  const s = ss_().getSheetByName(nama);
  if (!s) throw new Error('Tab "' + nama + '" tiada. Jalankan fungsi pasang() dahulu.');
  return s;
}
 
function rows_(nama) {
  const s = ss_().getSheetByName(nama);
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getDataRange().getValues();
  v.shift();
  return v;
}
 
function appendRows_(nama, baris) {
  if (!baris.length) return;
  const s = sheet_(nama);
  s.getRange(s.getLastRow() + 1, 1, baris.length, baris[0].length).setValues(baris);
}
 
function sirialAmbilan_(a) {
  return { masa: a.t.toISOString(), email: a.email, nama: a.nama, matriks: a.matriks, barang: a.barang,
    jumlah: a.jumlah, ulasan: a.ulasan, oleh: a.oleh, id: a.id, sumber: a.sumber };
}
 
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function normMatriks_(m) { return String(m || '').replace(/\s+/g, '').toUpperCase(); }
function idBaru_(awalan) { return awalan + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase(); }
function kunciTarikh_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function indeksHari_(k) { const p = String(k).split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); }
function kunciDariIndeks_(i) { return new Date(i * 864e5).toISOString().slice(0, 10); }
function tarikhDariKunci_(k) {
  const p = String(k).split('-').map(Number);
  if (p.length !== 3 || !p[0]) throw new Error('Tarikh tidak sah.');
  return new Date(Date.UTC(p[0], p[1] - 1, p[2], 4)); // tengah hari waktu Malaysia
}
function paparTarikh_(k) {
  const bulan = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const p = String(k).split('-').map(Number);
  return p[2] + ' ' + bulan[p[1] - 1] + ' ' + p[0];
}

