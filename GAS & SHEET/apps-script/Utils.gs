/**
 * Utiliti bersama eGerak PPD Manjung
 */

function getMasterSpreadsheet_() {
  var id = EGerakConfig.getSpreadsheetId();
  if (!id) {
    throw new Error('EGerak_SPREADSHEET_ID belum dikonfigurasi. Jalankan setupMasterSpreadsheet() atau set Script Property.');
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  var ss = getMasterSpreadsheet_();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet tidak dijumpai: ' + name);
  return sh;
}

function getActiveUserEmail_() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) return email.toLowerCase();
  } catch (e) { /* domain policy */ }
  try {
    var eff = Session.getEffectiveUser().getEmail();
    if (eff) return eff.toLowerCase();
  } catch (e2) { /* */ }
  return '';
}

function generateId_() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
}

function parseDateTime_(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  var s = String(raw).trim();
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    var hr = m[4] ? Number(m[4]) : 8;
    var mn = m[5] ? Number(m[5]) : 0;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hr, mn);
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 8, 0);
  return null;
}

function formatDateTimeMs_(d) {
  if (!d || isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, EGerakConfig.TIMEZONE, 'dd-MM-yyyy HH:mm');
}

function auditLog_(action, detail, email) {
  try {
    var sh = getSheet_(EGerakConfig.SHEETS.AUDIT);
    sh.appendRow([new Date(), email || getActiveUserEmail_(), action, JSON.stringify(detail || {})]);
  } catch (e) {
    Logger.log('Audit gagal: ' + e.message);
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function requireAuthUser_() {
  var email = getActiveUserEmail_();
  if (!email) throw new Error('Sila log masuk dengan akaun Google Workspace PPD.');
  var user = findUserByEmail_(email);
  if (!user) throw new Error('Akaun tidak berdaftar. Hubungi USTP.');
  if (user.aktif !== true && String(user.aktif).toUpperCase() !== 'TRUE') {
    throw new Error('Akaun tidak aktif.');
  }
  return user;
}

function findUserByEmail_(email) {
  var sh = getSheet_(EGerakConfig.SHEETS.USERS);
  var data = sh.getDataRange().getValues();
  var target = String(email).toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === target) {
      return {
        email: target,
        nama: data[i][1],
        jawatan: data[i][2],
        sektor: data[i][3],
        peranan: data[i][4] || 'Pengguna',
        aktif: data[i][5]
      };
    }
  }
  return null;
}

/** Cari indeks lajur mengikut tajuk baris 1 (elak lajur tertanggal bila tambah refleksi_draft) */
/** Pastikan lajur `aktif` wujud (padam lembut) */
function ensurePergerakanAktifColumn_(sh) {
  var col = getPergerakanColIndex_('aktif', -1);
  if (col >= 0) return col;
  var c = EGerakConfig.PERGERAKAN_COLS.AKTIF + 1;
  sh.getRange(1, c).setValue('aktif');
  return EGerakConfig.PERGERAKAN_COLS.AKTIF;
}

function isPergerakanRowActive_(row, colAktif) {
  if (colAktif < 0 || colAktif >= row.length) return true;
  var v = String(row[colAktif]).trim().toUpperCase();
  if (!v) return true;
  return v !== 'FALSE';
}

function getPergerakanColIndex_(headerName, fallbackIndex) {
  try {
    var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var want = String(headerName).trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === want) return i;
    }
  } catch (e) { /* */ }
  return fallbackIndex;
}

function cellToJsonSafe_(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, EGerakConfig.TIMEZONE, 'dd-MM-yyyy HH:mm');
  }
  return String(val);
}

function getOrCreateMonthFolder_(parentFolder, dateObj) {
  var tz = EGerakConfig.TIMEZONE;
  var d = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj : new Date();
  var key = Utilities.formatDate(d, tz, 'yyyy-MM');
  var it = parentFolder.getFoldersByName(key);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(key);
}

function extractDriveId_(url) {
  if (!url) return '';
  var s = String(url);
  if (s.includes('folders/')) return s.split('folders/')[1].split(/[/?#]/)[0];
  if (s.includes('id=')) return s.split('id=')[1].split('&')[0];
  if (s.includes('/d/')) return s.split('/d/')[1].split('/')[0];
  return s.length > 20 && !s.includes('/') ? s : '';
}

/**
 * Ambil folder OPR dengan mesej jelas jika ID salah / tiada kebenaran.
 */
function getDriveFolderSafe_(folderIdRaw, label) {
  var labelMs = label || 'OPR';
  var id = extractDriveId_(folderIdRaw) || String(folderIdRaw || '').trim();
  if (!id) {
    throw new Error(
      labelMs + ' folder ID kosong. Set EGerak_OPR_FOLDER_ID (URL folder Drive, bukan URL dokumen).'
    );
  }
  try {
    return DriveApp.getFolderById(id);
  } catch (e1) {
    try {
      var maybeFile = DriveApp.getFileById(id);
      var parents = maybeFile.getParents();
      if (parents.hasNext()) {
        Logger.log(labelMs + ': ID ialah fail, guna folder induk.');
        return parents.next();
      }
    } catch (e2) { /* bukan fail juga */ }
    throw new Error(
      'Tidak dapat akses folder ' + labelMs + ' (ID: ' + id + '). ' +
      'Semak: (1) ID dari URL .../folders/XXXX bukan /document/... ' +
      '(2) Kongsi folder kepada akaun anda (' + getActiveUserEmail_() + ') sebagai Editor. ' +
      'Ralat asal: ' + e1.message
    );
  }
}

function getDriveFileSafe_(fileIdRaw, label) {
  var id = extractDriveId_(fileIdRaw) || String(fileIdRaw || '').trim();
  if (!id) throw new Error((label || 'Fail') + ' ID kosong.');
  try {
    return DriveApp.getFileById(id);
  } catch (e) {
    throw new Error(
      'Tidak dapat akses ' + (label || 'fail') + '. Kongsi templat/fail kepada ' +
      getActiveUserEmail_() + ' (sekurang-kurangnya Viewer). ' + e.message
    );
  }
}
