/**
 * Import pukal dari sheet Rancangan_Tahunan
 */

function importBulk() {
  var user = requireAuthUser_();
  if (user.peranan !== 'Admin' && user.peranan !== 'Pentadbir') {
    throw new Error('Hanya Admin/Pentadbir boleh import pukal.');
  }

  var sh = getSheet_(EGerakConfig.SHEETS.BULK_IMPORT);
  var data = sh.getDataRange().getValues();
  var results = { ok: 0, error: 0, conflict: 0, skipped: 0 };
  var batch = 0;
  var pergerakanSheet = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][0] || '').toUpperCase();
    if (status === 'OK' || status === 'SKIP') {
      results.skipped++;
      continue;
    }

    var email = String(data[i][1] || '').toLowerCase();
    var u = findUserByEmail_(email);
    if (!u) {
      sh.getRange(i + 1, 1).setValue('ERROR');
      sh.getRange(i + 1, 11).setValue('Email tidak berdaftar');
      results.error++;
      continue;
    }

    var payload = {
      jenis: data[i][5] || 'Pergerakan Biasa',
      urusan: data[i][6],
      lokasi: data[i][7],
      tarikh_pergi: data[i][8],
      tarikh_kembali: data[i][9],
      source: 'bulk'
    };

    if (!payload.urusan || !payload.lokasi) {
      sh.getRange(i + 1, 1).setValue('ERROR');
      sh.getRange(i + 1, 11).setValue('Urusan/lokasi kosong');
      results.error++;
      continue;
    }

    try {
      var id = generateId_();
      pergerakanSheet.appendRow([
        id, new Date(), u.email, data[i][2] || u.nama, data[i][3] || u.jawatan,
        data[i][4] || u.sektor, payload.jenis, payload.urusan, payload.lokasi,
        payload.tarikh_pergi, payload.tarikh_kembali, '', '', '', '', '', '', '', 'bulk', 'TRUE'
      ]);
      var newRowIndex = pergerakanSheet.getLastRow();
      var sync = syncPergerakanRowByIndex(newRowIndex);

      if (sync && sync.ok === false && sync.reason === 'CONFLICT') {
        sh.getRange(i + 1, 1).setValue('CONFLICT');
        sh.getRange(i + 1, 12).setValue(id);
        results.conflict++;
      } else {
        sh.getRange(i + 1, 1).setValue('OK');
        sh.getRange(i + 1, 12).setValue(id);
        results.ok++;
      }
    } catch (err) {
      sh.getRange(i + 1, 1).setValue('ERROR');
      sh.getRange(i + 1, 11).setValue(err.message);
      results.error++;
    }

    batch++;
    if (batch >= EGerakConfig.BULK_BATCH_SIZE) {
      Utilities.sleep(EGerakConfig.BULK_SLEEP_MS);
      batch = 0;
    }
  }

  auditLog_('BULK_IMPORT', results, user.email);
  return results;
}

function importBulkFromMenu() {
  var ui = SpreadsheetApp.getUi();
  try {
    var r = importBulk();
    ui.alert('Import selesai', JSON.stringify(r, null, 2), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Import gagal', e.message, ui.ButtonSet.OK);
  }
}
