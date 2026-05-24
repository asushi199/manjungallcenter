/**
 * Segerak pergerakan → kalendar peribadi / sektor / master / bilik
 */

function onSubmitPergerakan(payload) {
  var user = requireAuthUser_();
  var start = parseDateTime_(payload.tarikh_pergi);
  var end = parseDateTime_(payload.tarikh_kembali);
  if (!start || !end) throw new Error('Tarikh tidak sah.');
  if (end < start) throw new Error('Tarikh kembali mesti selepas tarikh pergi.');

  var lokasi = String(payload.lokasi || '').trim();
  var jenis = payload.jenis || 'Pergerakan Biasa';
  var urusan = String(payload.urusan || '').trim();
  if (!urusan) throw new Error('Urusan pergerakan diperlukan.');

  var isCuti = isBercutiJenis_(jenis);
  var title = buildEventTitle_(user.nama, urusan, jenis);
  var desc = buildEventDescription_(user, urusan, lokasi, jenis, start, end);
  var needsRoom = !isCuti && !!(EGerakConfig.ROOM_PATTERNS.DEWAN.test(lokasi) || EGerakConfig.ROOM_PATTERNS.BUDIMAN.test(lokasi));

  var eventIds;
  var roomResult;
  var calendarNote;

  if (isCuti) {
    // Cuti: hanya rekod dalam Pergerakan — tiada kalendar (peribadi / sektor / TAKWIM / bilik).
    eventIds = emptyCalendarEventIds_();
    roomResult = { ok: true, skipped: true, pending: false };
    calendarNote = 'Pergerakan direkodkan.';
  } else {
    eventIds = emptyCalendarEventIds_();
    eventIds.pendingShared = true;
    eventIds.pendingRoom = needsRoom;
    eventIds.personal = createCalendarEventSafe_(CalendarApp.getDefaultCalendar().getId(), title, start, end, {
      description: desc,
      location: lokasi
    });
    roomResult = { ok: true, skipped: !needsRoom, pending: needsRoom };
    calendarNote =
      'Pergerakan disimpan. Kalendar sektor / TAKWIM' +
      (needsRoom ? ' / bilik' : '') +
      ' akan disegerakkan oleh sistem (biasanya dalam 1–10 minit).';
  }

  var row = appendPergerakanRow_(user, payload, eventIds, roomResult);
  row.calendarNote = calendarNote;

  auditLog_('SUBMIT_PERGERAKAN', { id: row.id, lokasi: lokasi, isCuti: isCuti }, user.email);
  return row;
}

function onDeletePergerakan(ids) {
  var user = requireAuthUser_();
  if (!ids || !ids.length) return { deleted: 0 };
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var colAktif = ensurePergerakanAktifColumn_(sh);
  var data = sh.getDataRange().getValues();
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colEmail = getPergerakanColIndex_('email', C.EMAIL);
  var colId = getPergerakanColIndex_('id', C.ID);
  var colSektor = getPergerakanColIndex_('sektor', C.SEKTOR);
  var colCalIds = getPergerakanColIndex_('calendar_event_ids', C.CALENDAR_EVENT_IDS);
  var deleted = 0;
  var idSet = {};
  for (var i = 0; i < ids.length; i++) idSet[String(ids[i])] = true;

  for (var r = data.length - 1; r >= 1; r--) {
    var rowId = String(data[r][colId]);
    if (!idSet[rowId]) continue;
    var rowEmail = String(data[r][colEmail]).toLowerCase();
    var isAdmin = user.peranan === 'Admin';
    if (rowEmail !== user.email && !isAdmin) continue;

    try {
      deleteCalendarEventsFromJson_(data[r][colCalIds], data[r][colSektor]);
    } catch (calErr) {
      Logger.log('Padam kalendar (abaikan): ' + calErr.message);
    }

    sh.getRange(r + 1, colAktif + 1).setValue('FALSE');
    deleted++;
    auditLog_('DELETE_PERGERAKAN', { id: rowId }, user.email);
  }
  return { deleted: deleted };
}

function maybeBookRoom_(lokasi, start, end, title, email) {
  var calId = '';
  var bilik = '';
  if (EGerakConfig.ROOM_PATTERNS.DEWAN.test(lokasi)) {
    calId = EGerakConfig.getCalendarId('DEWAN_BESTARI');
    bilik = 'Dewan Bestari';
  } else if (EGerakConfig.ROOM_PATTERNS.BUDIMAN.test(lokasi)) {
    calId = EGerakConfig.getCalendarId('BILIK_BUDIMAN');
    bilik = 'Bilik Budiman';
  }
  if (!calId) return { ok: true, skipped: true };

  if (hasRoomConflict_(calId, start, end)) {
    logRoomBooking_('', bilik, start, end, '', 'CONFLICT', email);
    return { ok: false, reason: 'CONFLICT' };
  }

  var evId = createCalendarEventSafe_(calId, '[Tempahan] ' + title, start, end, {
    description: 'Tempahan automatik eGerak — ' + email + '\nMasa: ' +
      formatDateTimeMs_(start) + ' — ' + formatDateTimeMs_(end),
    location: bilik
  });
  return { ok: true, eventId: evId, bilik: bilik, roomCalendarId: calId };
}

function hasRoomConflict_(calendarId, start, end) {
  try {
    var cal = CalendarApp.getCalendarById(calendarId);
    var events = cal.getEvents(start, end);
    return events.length > 0;
  } catch (e) {
    Logger.log('hasRoomConflict_: ' + e.message);
    return false;
  }
}

function createCalendarEventSafe_(calendarId, title, start, end, opts) {
  if (!calendarId) return '';
  try {
    var cal = CalendarApp.getCalendarById(calendarId);
    var range = toAllDayRange_(start, end);
    var eventOpts = {
      description: (opts && opts.description) || '',
      location: (opts && opts.location) || ''
    };
    var ev = range.singleDay
      ? cal.createAllDayEvent(title, range.startDay, eventOpts)
      : cal.createAllDayEvent(title, range.startDay, range.endExclusive, eventOpts);
    var color = (opts && opts.color) || getCalendarEventColorForId_(calendarId);
    if (color) {
      try {
        ev.setColor(color);
      } catch (colorErr) {
        Logger.log('setColor: ' + colorErr.message);
      }
    }
    return ev.getId();
  } catch (e) {
    Logger.log('createEvent gagal ' + calendarId + ': ' + e.message);
    return '';
  }
}

/** Acara sepanjang hari (warna blok penuh); masa tepat kekal dalam keterangan. */
function toAllDayRange_(start, end) {
  var tz = EGerakConfig.TIMEZONE;
  var startStr = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
  var endStr = Utilities.formatDate(end, tz, 'yyyy-MM-dd');
  var startDay = parseDateOnly_(startStr);
  var endDay = parseDateOnly_(endStr);
  if (endDay < startDay) endDay = startDay;
  var endExclusive = new Date(endDay.getTime());
  endExclusive.setDate(endExclusive.getDate() + 1);
  return {
    startDay: startDay,
    endExclusive: endExclusive,
    singleDay: startStr === endStr
  };
}

function parseDateOnly_(yyyyMmDd) {
  var parts = String(yyyyMmDd).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/** Warna acara (selari eMARS) — kalendar kongsi sahaja; peribadi guna lalai. */
function getCalendarEventColorForId_(calendarId) {
  if (!calendarId) return null;
  var id = String(calendarId);
  var master = EGerakConfig.getCalendarId('MASTER');
  if (id === master) return CalendarApp.Color.GRAY;
  var sektorColors = {
    'SEKTOR PERANCANGAN': CalendarApp.Color.RED,
    'SEKTOR PENGURUSAN SEKOLAH': CalendarApp.Color.BLUE,
    'SEKTOR PEMBANGUNAN MURID': CalendarApp.Color.GREEN,
    'SEKTOR PENTAKSIRAN DAN PEPERIKSAAN': CalendarApp.Color.YELLOW,
    'SEKTOR PSIKOLOGI KAUNSELING': CalendarApp.Color.MAUVE,
    'SEKTOR PENGURUSAN': CalendarApp.Color.CYAN,
    'UNIT SUMBER TEKNOLOGI PENDIDIKAN (USTP)': CalendarApp.Color.PALE_BLUE,
    'PEMBELAJARAN (EMARS)': CalendarApp.Color.ORANGE
  };
  var sektor = EGerakConfig.CALENDARS.SEKTOR;
  for (var k in sektor) {
    if (sektor[k] === id && sektorColors[k]) return sektorColors[k];
  }
  if (id === EGerakConfig.getCalendarId('DEWAN_BESTARI') ||
      id === EGerakConfig.getCalendarId('BILIK_BUDIMAN')) {
    return CalendarApp.Color.PALE_RED;
  }
  return null;
}

function deleteCalendarEventsFromJson_(jsonStr, sektor) {
  var map = parseEventIdsJson_(jsonStr);
  if (map.personal) {
    try {
      deleteEventById_(CalendarApp.getDefaultCalendar().getId(), map.personal);
    } catch (e) { Logger.log('padam personal: ' + e.message); }
  }
  deleteSharedCalendarEventsFromMap_(map, sektor);
}

function deleteEventById_(calendarId, eventId) {
  if (!calendarId || !eventId) return;
  try {
    var cal = CalendarApp.getCalendarById(calendarId);
    var ev = cal.getEventById(eventId);
    if (ev) ev.deleteEvent();
  } catch (e) {
    try {
      var cal2 = CalendarApp.getCalendarById(calendarId);
      var events = cal2.getEvents(new Date(2000, 0, 1), new Date(2100, 0, 1));
      for (var j = 0; j < events.length; j++) {
        if (events[j].getId() === eventId) {
          events[j].deleteEvent();
          break;
        }
      }
    } catch (e2) { Logger.log('deleteEvent: ' + e2.message); }
  }
}

function buildEventTitle_(nama, urusan, jenis) {
  var shortU = String(urusan || '').trim();
  if (!shortU) shortU = 'Pergerakan';
  if (shortU.length > 80) shortU = shortU.substring(0, 77) + '...';
  if (isBercutiJenis_(jenis)) return '[Bercuti] ' + shortU;
  return shortU;
}

function buildEventDescription_(user, urusan, lokasi, jenis, start, end) {
  var lines = ['eGerak PPD Manjung'];
  if (start && end) {
    lines.push('Masa: ' + formatDateTimeMs_(start) + ' — ' + formatDateTimeMs_(end));
  }
  lines.push(
    'Pegawai: ' + (user.nama || ''),
    'Jawatan: ' + (user.jawatan || ''),
    'Sektor: ' + (user.sektor || ''),
    'Jenis: ' + (jenis || ''),
    'Urusan: ' + (urusan || ''),
    'Lokasi: ' + (lokasi || '')
  );
  return lines.join('\n');
}

function appendPergerakanRow_(user, payload, eventIds, roomResult) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var id = generateId_();
  var roomStatus = roomResult.pending ? 'PENDING' : (roomResult.skipped ? '' : (roomResult.ok ? 'BOOKED' : 'CONFLICT'));
  var row = [
    id,
    new Date(),
    user.email,
    user.nama,
    user.jawatan,
    user.sektor,
    payload.jenis || 'Pergerakan Biasa',
    payload.urusan,
    payload.lokasi,
    payload.tarikh_pergi,
    payload.tarikh_kembali,
    JSON.stringify(eventIds),
    roomStatus,
    '',
    '',
    '',
    '',
    '',
    payload.source || 'web',
    'TRUE'
  ];
  sh.appendRow(row);
  return {
    id: id,
    email: user.email,
    urusan: payload.urusan,
    lokasi: payload.lokasi,
    tarikh_pergi: payload.tarikh_pergi,
    tarikh_kembali: payload.tarikh_kembali,
    room_status: roomStatus,
    calendar_event_ids: eventIds
  };
}

function logRoomBooking_(pergerakanId, bilik, start, end, eventId, status, email) {
  try {
    var sh = getSheet_(EGerakConfig.SHEETS.ROOM_LOG);
    sh.appendRow([new Date(), pergerakanId, bilik, start, end, eventId, status, email]);
  } catch (e) { Logger.log(e); }
}

function syncPergerakanRowByIndex(rowIndex) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colCal = getPergerakanColIndex_('calendar_event_ids', C.CALENDAR_EVENT_IDS);
  var colSektor = getPergerakanColIndex_('sektor', C.SEKTOR);
  var row = sh.getRange(rowIndex, 1, 1, Math.max(20, sh.getLastColumn())).getValues()[0];
  var colAktif = getPergerakanColIndex_('aktif', C.AKTIF);
  if (!isPergerakanRowActive_(row, colAktif)) return;

  var map = parseEventIdsJson_(row[colCal]);
  if (isBercutiJenis_(row[getPergerakanColIndex_('jenis', C.JENIS)])) {
    return clearCutiCalendarEventsForRow_(rowIndex, map, row[colSektor], colCal);
  }

  map.pendingShared = true;
  map.pendingRoom = map.pendingRoom || EGerakConfig.ROOM_PATTERNS.DEWAN.test(String(row[getPergerakanColIndex_('lokasi', C.LOKASI)])) ||
    EGerakConfig.ROOM_PATTERNS.BUDIMAN.test(String(row[getPergerakanColIndex_('lokasi', C.LOKASI)]));
  sh.getRange(rowIndex, colCal + 1).setValue(JSON.stringify(map));
  return syncSharedCalendarsForRowIndex_(rowIndex);
}

function emptyCalendarEventIds_() {
  return {
    personal: '',
    sektor: '',
    master: '',
    room: '',
    roomCalendarId: '',
    pendingShared: false,
    pendingRoom: false
  };
}

/** Padam semua acara kalendar bagi rekod cuti; kekal kosong. */
function clearCutiCalendarEventsForRow_(rowIndex, map, sektor, colCal) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  if (map.personal || map.sektor || map.master || map.room) {
    deleteCalendarEventsFromJson_(JSON.stringify(map), sektor);
  }
  sh.getRange(rowIndex, colCal + 1).setValue(JSON.stringify(emptyCalendarEventIds_()));
  sh.getRange(rowIndex, getPergerakanColIndex_('room_status', C.ROOM_STATUS) + 1).setValue('');
  return { ok: true, skipped: true, reason: 'cuti_no_calendar' };
}

function parseEventIdsJson_(jsonStr) {
  try {
    return jsonStr ? JSON.parse(jsonStr) : {};
  } catch (e) {
    return {};
  }
}

function isBercutiJenis_(jenis) {
  var j = String(jenis || '').toLowerCase();
  return j.indexOf('bercuti') >= 0 || j.indexOf('cuti') >= 0;
}

function needsSharedCalendarSync_(map, jenis) {
  if (isBercutiJenis_(jenis)) {
    return !!(map.personal || map.sektor || map.master || map.room);
  }
  if (map.pendingShared === true) return true;
  if (map.pendingRoom === true && !map.room) return true;
  if (!map.master && map.pendingShared !== false) return true;
  return false;
}

/**
 * Tulis kalendar sektor + TAKWIM + bilik — mesti dijalankan sebagai akaun USTP (pemilik script / pemilik kalendar).
 * Pasang pencetus masa: syncSharedCalendarsDeployer setiap 5–10 minit.
 */
function syncSharedCalendarsDeployer() {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colAktif = getPergerakanColIndex_('aktif', C.AKTIF);
  var last = sh.getLastRow();
  var synced = 0;
  var cleaned = 0;
  var failed = 0;
  for (var r = 2; r <= last; r++) {
    try {
      var row = sh.getRange(r, 1, 1, Math.max(20, sh.getLastColumn())).getValues()[0];
      if (!isPergerakanRowActive_(row, colAktif)) {
        if (cleanupSharedCalendarEventsForRowIndex_(r)) cleaned++;
        continue;
      }
      var res = syncSharedCalendarsForRowIndex_(r);
      if (res && res.ok) synced++;
      else if (res && res.reason === 'CONFLICT') failed++;
    } catch (e) {
      failed++;
      Logger.log('sync row ' + r + ': ' + e.message);
    }
  }
  auditLog_('SYNC_CALENDARS_DEPLOYER', { synced: synced, cleaned: cleaned, failed: failed }, 'system');
  return { synced: synced, cleaned: cleaned, failed: failed };
}

/** Padam acara sektor / TAKWIM / bilik bagi baris tidak aktif (pegawai tiada kebenaran padam). */
function cleanupSharedCalendarEventsForRowIndex_(rowIndex) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colCal = getPergerakanColIndex_('calendar_event_ids', C.CALENDAR_EVENT_IDS);
  var colSektor = getPergerakanColIndex_('sektor', C.SEKTOR);
  var row = sh.getRange(rowIndex, 1, 1, Math.max(20, sh.getLastColumn())).getValues()[0];
  var map = parseEventIdsJson_(row[colCal]);
  if (!map.sektor && !map.master && !map.room) return false;

  deleteSharedCalendarEventsFromMap_(map, row[colSektor]);
  map.sektor = '';
  map.master = '';
  map.room = '';
  map.roomCalendarId = '';
  map.pendingShared = false;
  map.pendingRoom = false;
  sh.getRange(rowIndex, colCal + 1).setValue(JSON.stringify(map));
  return true;
}

function deleteSharedCalendarEventsFromMap_(map, sektor) {
  if (map.sektor) deleteEventById_(EGerakConfig.getSektorCalendarId(sektor), map.sektor);
  if (map.master) deleteEventById_(EGerakConfig.getCalendarId('MASTER'), map.master);
  if (map.room) {
    if (map.roomCalendarId) {
      deleteEventById_(map.roomCalendarId, map.room);
    } else {
      deleteEventById_(EGerakConfig.getCalendarId('DEWAN_BESTARI'), map.room);
      deleteEventById_(EGerakConfig.getCalendarId('BILIK_BUDIMAN'), map.room);
    }
  }
}

function syncSharedCalendarsForRowIndex_(rowIndex) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  var colCal = getPergerakanColIndex_('calendar_event_ids', C.CALENDAR_EVENT_IDS);
  var colRoom = getPergerakanColIndex_('room_status', C.ROOM_STATUS);
  var colId = getPergerakanColIndex_('id', C.ID);
  var row = sh.getRange(rowIndex, 1, 1, Math.max(20, sh.getLastColumn())).getValues()[0];
  var colAktif = getPergerakanColIndex_('aktif', C.AKTIF);
  if (!isPergerakanRowActive_(row, colAktif)) return { skipped: true, reason: 'inactive' };

  var map = parseEventIdsJson_(row[colCal]);
  var jenisEarly = row[getPergerakanColIndex_('jenis', C.JENIS)];
  var colSektor = getPergerakanColIndex_('sektor', C.SEKTOR);
  if (isBercutiJenis_(jenisEarly)) {
    return clearCutiCalendarEventsForRow_(rowIndex, map, row[colSektor], colCal);
  }
  if (!needsSharedCalendarSync_(map, jenisEarly)) return { skipped: true, reason: 'already_synced' };

  var user = {
    email: String(row[getPergerakanColIndex_('email', C.EMAIL)]),
    nama: row[getPergerakanColIndex_('nama', C.NAMA)],
    jawatan: row[getPergerakanColIndex_('jawatan', C.JAWATAN)],
    sektor: row[getPergerakanColIndex_('sektor', C.SEKTOR)]
  };
  var payload = {
    jenis: row[getPergerakanColIndex_('jenis', C.JENIS)],
    urusan: row[getPergerakanColIndex_('urusan', C.URUSAN)],
    lokasi: row[getPergerakanColIndex_('lokasi', C.LOKASI)],
    tarikh_pergi: row[getPergerakanColIndex_('tarikh_pergi', C.TARIKH_PERGI)],
    tarikh_kembali: row[getPergerakanColIndex_('tarikh_kembali', C.TARIKH_KEMBALI)]
  };
  var start = parseDateTime_(payload.tarikh_pergi);
  var end = parseDateTime_(payload.tarikh_kembali);
  if (!start || !end) return { ok: false, reason: 'bad_dates' };

  var title = buildEventTitle_(user.nama, payload.urusan, payload.jenis);
  var desc = buildEventDescription_(user, payload.urusan, payload.lokasi, payload.jenis, start, end);
  var lokasi = String(payload.lokasi || '');

  if (!map.room && (map.pendingRoom || EGerakConfig.ROOM_PATTERNS.DEWAN.test(lokasi) || EGerakConfig.ROOM_PATTERNS.BUDIMAN.test(lokasi))) {
    var roomResult = maybeBookRoom_(lokasi, start, end, payload.urusan, user.email);
    if (!roomResult.ok && roomResult.reason === 'CONFLICT') {
      sh.getRange(rowIndex, colRoom + 1).setValue('CONFLICT');
      return { ok: false, reason: 'CONFLICT' };
    }
    if (roomResult.eventId) {
      map.room = roomResult.eventId;
      map.roomCalendarId = roomResult.roomCalendarId || '';
      sh.getRange(rowIndex, colRoom + 1).setValue('BOOKED');
      logRoomBooking_(String(row[colId]), lokasi, start, end, roomResult.eventId, 'OK', user.email);
    }
  }

  var sektorCalId = EGerakConfig.getSektorCalendarId(user.sektor);
  if (sektorCalId && !map.sektor) {
    map.sektor = createCalendarEventSafe_(sektorCalId, title, start, end, { description: desc, location: lokasi });
  }

  var masterId = EGerakConfig.getCalendarId('MASTER');
  if (masterId && !map.master) {
    map.master = createCalendarEventSafe_(masterId, title, start, end, { description: desc, location: lokasi });
  }

  map.pendingShared = false;
  map.pendingRoom = false;
  sh.getRange(rowIndex, colCal + 1).setValue(JSON.stringify(map));

  if (!map.sektor && !map.master) {
    return { ok: false, reason: 'no_calendar_access' };
  }
  return { ok: true, eventIds: map };
}

function installCalendarSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncSharedCalendarsDeployer') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('syncSharedCalendarsDeployer')
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log('Pencetus syncSharedCalendarsDeployer setiap 10 minit dipasang.');
}
