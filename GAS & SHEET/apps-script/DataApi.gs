/**
 * API data untuk Web App
 */

function listPergerakanSaya() {
  var user = requireAuthUser_();
  return listPergerakanFiltered_({ email: user.email, aktifOnly: true });
}

function listPergerakanHariIni(filterDate) {
  var user = requireAuthUser_();
  var d = filterDate ? parseDateTime_(filterDate) : new Date();
  if (!d) d = new Date();
  var startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  var all = listPergerakanFiltered_({ aktifOnly: true });
  if (user.peranan !== 'Admin') {
    return all.filter(function (p) {
      var pg = parseDateTime_(p.tarikh_pergi);
      return pg && pg >= startDay && pg <= endDay;
    });
  }
  return all.filter(function (p) {
    var pg = parseDateTime_(p.tarikh_pergi);
    return pg && pg >= startDay && pg <= endDay;
  });
}

function listPergerakanFiltered_(opts) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var data = sh.getDataRange().getValues();
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colEmail = getPergerakanColIndex_('email', C.EMAIL);
  var colAktif = getPergerakanColIndex_('aktif', C.AKTIF);
  var wantEmail = opts.email ? String(opts.email).toLowerCase() : '';
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (opts.aktifOnly && !isPergerakanRowActive_(data[i], colAktif)) continue;
    if (wantEmail && String(data[i][colEmail]).toLowerCase() !== wantEmail) continue;
    out.push(rowToPergerakan_(data[i], i + 1));
  }
  out.sort(function (a, b) {
    var da = parseDateTime_(a.tarikh_pergi);
    var db = parseDateTime_(b.tarikh_pergi);
    if (!da || !db) return 0;
    return db - da;
  });
  return out;
}

function rowToPergerakan_(row, rowIndex) {
  var C = EGerakConfig.PERGERAKAN_COLS;
  var ci = function (name, fb) { return getPergerakanColIndex_(name, fb); };
  return {
    rowIndex: rowIndex,
    id: cellToJsonSafe_(row[ci('id', C.ID)]),
    timestamp: cellToJsonSafe_(row[ci('timestamp', C.TIMESTAMP)]),
    email: cellToJsonSafe_(row[ci('email', C.EMAIL)]),
    nama: cellToJsonSafe_(row[ci('nama', C.NAMA)]),
    jawatan: cellToJsonSafe_(row[ci('jawatan', C.JAWATAN)]),
    sektor: cellToJsonSafe_(row[ci('sektor', C.SEKTOR)]),
    jenis: cellToJsonSafe_(row[ci('jenis', C.JENIS)]),
    urusan: cellToJsonSafe_(row[ci('urusan', C.URUSAN)]),
    lokasi: cellToJsonSafe_(row[ci('lokasi', C.LOKASI)]),
    tarikh_pergi: formatDateTimeMs_(parseDateTime_(row[ci('tarikh_pergi', C.TARIKH_PERGI)])) ||
      cellToJsonSafe_(row[ci('tarikh_pergi', C.TARIKH_PERGI)]),
    tarikh_kembali: formatDateTimeMs_(parseDateTime_(row[ci('tarikh_kembali', C.TARIKH_KEMBALI)])) ||
      cellToJsonSafe_(row[ci('tarikh_kembali', C.TARIKH_KEMBALI)]),
    room_status: cellToJsonSafe_(row[ci('room_status', C.ROOM_STATUS)]),
    opr_status: cellToJsonSafe_(row[ci('opr_status', C.OPR_STATUS)]),
    opr_file_url: cellToJsonSafe_(row[ci('opr_file_url', C.OPR_FILE_URL)]),
    dapatan_draft: cellToJsonSafe_(row[ci('dapatan_draft', C.DAPATAN_DRAFT)]),
    rumusan_draft: cellToJsonSafe_(row[ci('rumusan_draft', C.RUMUSAN_DRAFT)]),
    refleksi_draft: cellToJsonSafe_(row[ci('refleksi_draft', C.REFLEKSI_DRAFT)]),
    source: cellToJsonSafe_(row[ci('source', C.SOURCE)])
  };
}

function getDashboardStats() {
  var user = requireAuthUser_();
  var today = new Date();
  var startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var endDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  var all = listPergerakanFiltered_({ aktifOnly: true });
  var todayList = all.filter(function (p) {
    var pg = parseDateTime_(p.tarikh_pergi);
    return pg && pg >= startDay && pg <= endDay;
  });
  var pergerakan = 0;
  var bercuti = 0;
  todayList.forEach(function (p) {
    if (String(p.jenis).toLowerCase().indexOf('bercuti') >= 0) bercuti++;
    else pergerakan++;
  });
  var mine = listPergerakanFiltered_({ email: user.email, aktifOnly: true });
  return {
    user: user,
    todayTotal: todayList.length,
    todayPergerakan: pergerakan,
    todayBercuti: bercuti,
    myTotal: mine.length
  };
}

function getSessionInfo() {
  var email = getActiveUserEmail_();
  if (!email) return { loggedIn: false };
  var user = findUserByEmail_(email);
  if (!user) return { loggedIn: false, email: email, registered: false };
  return {
    loggedIn: true,
    registered: true,
    user: user,
    lokasiPresets: EGerakConfig.LOKASI_PRESETS,
    sektors: EGerakConfig.listSektors()
  };
}

function searchPergerakan(query) {
  requireAuthUser_();
  var q = String(query || '').toLowerCase();
  var mine = listPergerakanSaya();
  if (!q) return mine;
  return mine.filter(function (p) {
    return (p.urusan && p.urusan.toLowerCase().indexOf(q) >= 0) ||
      (p.lokasi && p.lokasi.toLowerCase().indexOf(q) >= 0);
  });
}
