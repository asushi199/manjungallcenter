/**
 * Satu kali: cipta struktur Master Spreadsheet + contoh pengguna
 * Jalankan: setupMasterSpreadsheet() dari editor Apps Script
 * Kemudian salin Spreadsheet ID ke Config.gs / Script Property EGerak_SPREADSHEET_ID
 */

function setupMasterSpreadsheet() {
  var ss = SpreadsheetApp.create('eGerak PPD Manjung - Master Data');
  var id = ss.getId();
  PropertiesService.getScriptProperties().setProperty('EGerak_SPREADSHEET_ID', id);

  setupSheetUsers_(ss);
  setupSheetPergerakan_(ss);
  setupSheetBulk_(ss);
  setupSheetRoomLog_(ss);
  setupSheetAudit_(ss);

  removeDefaultSheet1_(ss);

  SpreadsheetApp.flush();
  Logger.log('Master Spreadsheet dicipta. ID: ' + id);
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('Set EGerak_SPREADSHEET_ID dalam Script Properties (sudah auto-set).');
  try {
    installSpreadsheetMenuTrigger();
    Logger.log('Pencetus menu eGerak dipasang. Buka semula sheet untuk lihat menu.');
  } catch (e) {
    Logger.log('Menu trigger: ' + e.message);
  }
  return { spreadsheetId: id, url: ss.getUrl() };
}

function setupSheetUsers_(ss) {
  var name = EGerakConfig.SHEETS.USERS;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 6).setValues([[
    'email', 'nama', 'jawatan', 'sektor', 'peranan', 'aktif'
  ]]);
  // getRange(baris, lajur, bilanganBaris, bilanganLajur) — 1 baris contoh
  sh.getRange(2, 1, 1, 6).setValues([[
    'contoh@ppdmanjung.edu.my',
    'EN. CONTOH PEGAWAI',
    'PENOLONG PPD CONTOH',
    'UNIT SUMBER TEKNOLOGI PENDIDIKAN (USTP)',
    'Admin',
    'TRUE'
  ]]);
  sh.setFrozenRows(1);
}

function setupSheetPergerakan_(ss) {
  var name = EGerakConfig.SHEETS.PERGERAKAN;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 20).setValues([[
    'id', 'timestamp', 'email', 'nama', 'jawatan', 'sektor', 'jenis', 'urusan', 'lokasi',
    'tarikh_pergi', 'tarikh_kembali', 'calendar_event_ids', 'room_status', 'opr_status',
    'opr_file_url', 'dapatan_draft', 'rumusan_draft', 'refleksi_draft', 'source', 'aktif'
  ]]);
  sh.setFrozenRows(1);
}

function setupSheetBulk_(ss) {
  var name = EGerakConfig.SHEETS.BULK_IMPORT;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 12).setValues([[
    'status_import', 'email', 'nama', 'jawatan', 'sektor', 'jenis', 'urusan', 'lokasi',
    'tarikh_pergi', 'tarikh_kembali', 'nota', 'id_hasil'
  ]]);
  sh.getRange(2, 1).setValue('PENDING');
  sh.getRange(2, 11).setNote('Isi baris 2+. status_import: PENDING | OK | ERROR | CONFLICT');
  sh.setFrozenRows(1);
}

function setupSheetRoomLog_(ss) {
  var name = EGerakConfig.SHEETS.ROOM_LOG;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 8).setValues([[
    'timestamp', 'pergerakan_id', 'bilik', 'tarikh_mula', 'tarikh_tamat', 'event_id', 'status', 'email'
  ]]);
  sh.setFrozenRows(1);
}

/** Buang Sheet1 lalai (kosong) — skrip tidak guna tab ini */
function removeDefaultSheet1_(ss) {
  var sh = ss.getSheetByName('Sheet1');
  if (!sh) return;
  if (ss.getSheets().length <= 1) return;
  ss.deleteSheet(sh);
}

function setupSheetAudit_(ss) {
  var name = EGerakConfig.SHEETS.AUDIT;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, 4).setValues([['timestamp', 'email', 'action', 'detail']]);
  sh.setFrozenRows(1);
}

/**
 * Simpan ID kalendar ke Script Properties (jalankan selepas buat kalendar di Admin)
 * Contoh: setCalendarIds({ MASTER: 'xxx@group.calendar.google.com', DEWAN_BESTARI: '...', ... })
 */
function setCalendarIds(map) {
  if (map.MASTER) PropertiesService.getScriptProperties().setProperty('EGerak_CAL_MASTER', map.MASTER);
  if (map.DEWAN_BESTARI) PropertiesService.getScriptProperties().setProperty('EGerak_CAL_DEWAN', map.DEWAN_BESTARI);
  if (map.BILIK_BUDIMAN) PropertiesService.getScriptProperties().setProperty('EGerak_CAL_BUDIMAN', map.BILIK_BUDIMAN);
  if (map.SEKTOR) {
    var keys = Object.keys(map.SEKTOR);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var prop = 'EGerak_CAL_' + EGerakConfig.normalizeSektor(k).replace(/\s+/g, '_');
      PropertiesService.getScriptProperties().setProperty(prop, map.SEKTOR[k]);
    }
  }
  Logger.log('Calendar IDs disimpan dalam Script Properties.');
}

/**
 * Satu klik: salin semua ID eMARS dari Config.gs ke Script Properties.
 * Jalankan sekali selepas clasp push (fungsi: applyEmarsCalendarFromConfig).
 */
function applyEmarsCalendarFromConfig() {
  var C = EGerakConfig.CALENDARS;
  setCalendarIds({
    MASTER: C.MASTER,
    DEWAN_BESTARI: C.DEWAN_BESTARI,
    BILIK_BUDIMAN: C.BILIK_BUDIMAN,
    SEKTOR: C.SEKTOR
  });
  Logger.log('eMARS calendar IDs applied. MASTER=' + C.MASTER);
}
