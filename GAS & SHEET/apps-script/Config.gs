/**
 * eGerak PPD Manjung — Konfigurasi (isi ID selepas buat Sheet & Calendar di Workspace)
 * JANGAN simpan GEMINI_API_KEY di sini — guna Script Properties.
 */
var EGerakConfig = (function () {
  /** Ganti dengan ID Spreadsheet Master (dari URL) */
  var SPREADSHEET_ID = '';

  /** Folder Drive untuk OPR & gambar (opsyenal) */
  var OPR_FOLDER_ID = '';
  var OPR_TEMPLATE_DOC_ID = '';
  var PHOTO_ARCHIVE_ROOT_FOLDER_ID = '';

  /**
   * Kalendar eMARS (rujuk calendar/calendar.txt + calendar-ids.md)
   * MASTER = kalendar gabungan TAKWIM dalam embed (bukan dalam calendar.txt)
   */
  var CALENDARS = {
    MASTER: 'c_5458a401004ee468862942871b65f87819427db963d7fe1542b979ec13e4b463@group.calendar.google.com',
    DEWAN_BESTARI: '',
    BILIK_BUDIMAN: '',
    SEKTOR: {
      'SEKTOR PERANCANGAN': 'c_db1296f674e7e6e1d8ac680b7cd391cc6b08df18d8cf7177cb33daf8222317a8@group.calendar.google.com',
      'SEKTOR PENGURUSAN SEKOLAH': 'c_7d71e5312eb62156f15887b45a18d5b6168d9ef167b34a5e0a7c862cf8ab833d@group.calendar.google.com',
      'SEKTOR PEMBANGUNAN MURID': 'c_73600838a142f4d1d215a0f62fafc218e01f0bd1e6afbdcd7000be38a71130dc@group.calendar.google.com',
      'SEKTOR PENTAKSIRAN DAN PEPERIKSAAN': 'c_055f8536861f317c78d865cc744f49d38933c27e90c20d65730f679a21c1a9e1@group.calendar.google.com',
      'SEKTOR PSIKOLOGI KAUNSELING': 'c_597a5117fe45a7f463a115cca8e22513933d51e2783ef4b4fa3660b1c5be0acd@group.calendar.google.com',
      'SEKTOR PENGURUSAN': 'c_a9cf75924aa6619e4f24ec6f0bb4d755d8de1b36a15426639a2d9813dcb40c1c@group.calendar.google.com',
      'UNIT SUMBER TEKNOLOGI PENDIDIKAN (USTP)': 'c_07ea831973519ec6379185af0a2fd2053aeec6d5c15fab56dc24461b74e5c2e2@group.calendar.google.com',
      /** Opsyenal — ada dalam embed eMARS, tiada dalam senarai 7 sektor eGerak asal */
      'PEMBELAJARAN (EMARS)': 'c_7f03058deb91e62f83e1394498c71f473b6809d95258b0053384abf4d518ea6f@group.calendar.google.com'
    }
  };

  var SHEETS = {
    USERS: 'Users',
    PERGERAKAN: 'Pergerakan',
    BULK_IMPORT: 'Rancangan_Tahunan',
    ROOM_LOG: 'Room_Log',
    AUDIT: 'Audit'
  };

  /** Nama lajur Pergerakan (mesti sepadan dengan baris 1 Sheet) */
  var PERGERAKAN_COLS = {
    ID: 0,
    TIMESTAMP: 1,
    EMAIL: 2,
    NAMA: 3,
    JAWATAN: 4,
    SEKTOR: 5,
    JENIS: 6,
    URUSAN: 7,
    LOKASI: 8,
    TARIKH_PERGI: 9,
    TARIKH_KEMBALI: 10,
    CALENDAR_EVENT_IDS: 11,
    ROOM_STATUS: 12,
    OPR_STATUS: 13,
    OPR_FILE_URL: 14,
    DAPATAN_DRAFT: 15,
    RUMUSAN_DRAFT: 16,
    REFLEKSI_DRAFT: 17,
    SOURCE: 18,
    AKTIF: 19
  };

  var BULK_BATCH_SIZE = 50;
  var BULK_SLEEP_MS = 500;
  var TIMEZONE = 'Asia/Kuala_Lumpur';

  var ROOM_PATTERNS = {
    DEWAN: /dewan\s*bestari/i,
    BUDIMAN: /bilik\s*budiman/i
  };

  var LOKASI_PRESETS = [
    'Dewan Bestari',
    'Bilik Budiman',
    'Pejabat PPD Manjung',
    'Lain-lain (taip sendiri)'
  ];

  function getSpreadsheet() {
    if (!SPREADSHEET_ID) {
      throw new Error('Sila set SPREADSHEET_ID dalam Config.gs atau Script Property EGerak_SPREADSHEET_ID');
    }
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  function getSpreadsheetId() {
    var id = PropertiesService.getScriptProperties().getProperty('EGerak_SPREADSHEET_ID');
    return id || SPREADSHEET_ID;
  }

  function getCalendarId(key) {
    if (key === 'MASTER') return CALENDARS.MASTER || PropertiesService.getScriptProperties().getProperty('EGerak_CAL_MASTER') || '';
    if (key === 'DEWAN_BESTARI') return CALENDARS.DEWAN_BESTARI || PropertiesService.getScriptProperties().getProperty('EGerak_CAL_DEWAN') || '';
    if (key === 'BILIK_BUDIMAN') return CALENDARS.BILIK_BUDIMAN || PropertiesService.getScriptProperties().getProperty('EGerak_CAL_BUDIMAN') || '';
    return '';
  }

  function getSektorCalendarId(sektor) {
    var normalized = normalizeSektor(sektor);
    return CALENDARS.SEKTOR[normalized] || PropertiesService.getScriptProperties().getProperty('EGerak_CAL_' + normalized.replace(/\s+/g, '_')) || '';
  }

  function normalizeSektor(s) {
    if (!s) return '';
    return String(s).replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function listSektors() {
    return Object.keys(CALENDARS.SEKTOR);
  }

  return {
    SPREADSHEET_ID: SPREADSHEET_ID,
    OPR_FOLDER_ID: OPR_FOLDER_ID,
    OPR_TEMPLATE_DOC_ID: OPR_TEMPLATE_DOC_ID,
    PHOTO_ARCHIVE_ROOT_FOLDER_ID: PHOTO_ARCHIVE_ROOT_FOLDER_ID,
    CALENDARS: CALENDARS,
    SHEETS: SHEETS,
    PERGERAKAN_COLS: PERGERAKAN_COLS,
    BULK_BATCH_SIZE: BULK_BATCH_SIZE,
    BULK_SLEEP_MS: BULK_SLEEP_MS,
    TIMEZONE: TIMEZONE,
    ROOM_PATTERNS: ROOM_PATTERNS,
    LOKASI_PRESETS: LOKASI_PRESETS,
    getSpreadsheet: getSpreadsheet,
    getSpreadsheetId: getSpreadsheetId,
    getCalendarId: getCalendarId,
    getSektorCalendarId: getSektorCalendarId,
    normalizeSektor: normalizeSektor,
    listSektors: listSektors
  };
})();
