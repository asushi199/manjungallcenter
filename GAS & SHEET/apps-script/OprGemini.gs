/**
 * OPR: draf Gemini + jana Google Doc dari templat
 */

function generateOprDraft(pergerakanId, notaPegawai, photoFileIds) {
  var user = requireAuthUser_();
  var row = getPergerakanRowById_(pergerakanId);
  if (!row) throw new Error('Pergerakan tidak dijumpai.');
  if (String(row.email).toLowerCase() !== user.email && user.peranan !== 'Admin') {
    throw new Error('Tiada kebenaran untuk rekod ini.');
  }

  var draft = callGeminiForOpr_(row, notaPegawai, photoFileIds || []);
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var rowIndex = row._rowIndex;
  var C = EGerakConfig.PERGERAKAN_COLS;
  sh.getRange(rowIndex, C.DAPATAN_DRAFT + 1).setValue(draft.dapatan);
  sh.getRange(rowIndex, C.RUMUSAN_DRAFT + 1).setValue(draft.rumusan);
  sh.getRange(rowIndex, C.REFLEKSI_DRAFT + 1).setValue(draft.refleksi || '');
  sh.getRange(rowIndex, C.OPR_STATUS + 1).setValue('DRAFT');

  auditLog_('OPR_DRAFT', { id: pergerakanId }, user.email);
  return {
    dapatan: draft.dapatan,
    rumusan: draft.rumusan,
    refleksi: draft.refleksi || '',
    disclaimer: 'Dijana AI – sila semak sebelum muktamad.'
  };
}

function finalizeOpr(pergerakanId, dapatan, rumusan, refleksi, photoFileIds) {
  var user = requireAuthUser_();
  var row = getPergerakanRowById_(pergerakanId);
  if (!row) throw new Error('Pergerakan tidak dijumpai.');

  var templateId = EGerakConfig.OPR_TEMPLATE_DOC_ID ||
    PropertiesService.getScriptProperties().getProperty('EGerak_OPR_TEMPLATE_DOC_ID');
  var folderId = EGerakConfig.OPR_FOLDER_ID ||
    PropertiesService.getScriptProperties().getProperty('EGerak_OPR_FOLDER_ID');

  if (!templateId) throw new Error('OPR template ID belum dikonfigurasi (EGerak_OPR_TEMPLATE_DOC_ID).');

  var start = parseDateTime_(row.tarikh_pergi);
  var destFolder = folderId
    ? getDriveFolderSafe_(folderId, 'OPR')
    : DriveApp.getRootFolder();
  var monthFolder = getOrCreateMonthFolder_(destFolder, start);
  var copyName = row.nama + ' - OPR - ' + (row.urusan || '').substring(0, 40) + ' (' + Utilities.formatDate(new Date(), EGerakConfig.TIMEZONE, 'yyyyMMdd') + ')';
  var copyDocId = copyOprFromTemplate_(templateId, copyName, monthFolder);
  var doc = openGoogleDocumentSafe_(copyDocId);
  var body = doc.getBody();

  var tarikhText = formatDateTimeMs_(start) + (row.tarikh_kembali ? ' hingga ' + formatDateTimeMs_(parseDateTime_(row.tarikh_kembali)) : '');

  body.replaceText('{{NAMA}}', row.nama || '');
  body.replaceText('{{JAWATAN}}', row.jawatan || '');
  body.replaceText('{{SEKTOR}}', row.sektor || '');
  body.replaceText('{{URUSAN}}', row.urusan || '');
  body.replaceText('{{LOKASI}}', row.lokasi || '');
  body.replaceText('{{TARIKH}}', tarikhText);
  var refleksiText = refleksi || row.refleksi_draft || '';
  body.replaceText('{{DAPATAN}}', dapatan || row.dapatan_draft || '');
  body.replaceText('{{RUMUSAN}}', rumusan || row.rumusan_draft || '');
  body.replaceText('{{REFLEKSI}}', refleksiText);
  body.replaceText('{{TINDAKAN_SUSULAN}}', refleksiText);
  body.replaceText('{{NOTA_AI}}', refleksiText);

  insertPhotosIntoDoc_(body, photoFileIds || []);

  doc.saveAndClose();
  var url = DriveApp.getFileById(copyDocId).getUrl();

  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var C = EGerakConfig.PERGERAKAN_COLS;
  sh.getRange(row._rowIndex, C.OPR_STATUS + 1).setValue('DONE');
  sh.getRange(row._rowIndex, C.OPR_FILE_URL + 1).setValue(url);
  if (dapatan) sh.getRange(row._rowIndex, C.DAPATAN_DRAFT + 1).setValue(dapatan);
  if (rumusan) sh.getRange(row._rowIndex, C.RUMUSAN_DRAFT + 1).setValue(rumusan);
  if (refleksi) sh.getRange(row._rowIndex, C.REFLEKSI_DRAFT + 1).setValue(refleksi);

  try {
    DriveApp.getFileById(copyDocId).addViewer(user.email);
  } catch (e) { Logger.log('addViewer: ' + e.message); }

  auditLog_('OPR_FINAL', { id: pergerakanId, url: url }, user.email);
  return { url: url, fileId: copyDocId };
}

function callGeminiForOpr_(row, nota, photoFileIds) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      dapatan: '[Sila set GEMINI_API_KEY dalam Script Properties]\n\n' + buildFallbackDapatan_(row, nota),
      rumusan: buildFallbackRumusan_(row, nota),
      refleksi: buildFallbackRefleksi_(row, nota)
    };
  }

  var prompt = [
    'Anda pembantu laporan rasmi Pejabat Pendidikan Daerah Manjung (Bahasa Malaysia formal).',
    'Hasilkan tiga bahagian untuk OPR aktiviti pegawai:',
    '1) dapatan — isu/dapatan program (3-5 ayat)',
    '2) rumusan — impak/kesan aktiviti (2-3 ayat)',
    '3) refleksi — gabungan refleksi, tindakan susulan dan penambahbaikan (2-4 ayat, Bahasa Malaysia)',
    'Gunakan data berikut:',
    'Nama: ' + row.nama,
    'Jawatan: ' + row.jawatan,
    'Sektor: ' + row.sektor,
    'Urusan: ' + row.urusan,
    'Lokasi: ' + row.lokasi,
    'Tarikh: ' + row.tarikh_pergi + ' hingga ' + row.tarikh_kembali,
    'Nota pegawai: ' + (nota || '-'),
    'Format jawapan JSON sahaja: {"dapatan":"...","rumusan":"...","refleksi":"..."}'
  ].join('\n');

  var parts = [{ text: prompt }];
  for (var i = 0; i < photoFileIds.length && i < 5; i++) {
    var fid = extractDriveId_(photoFileIds[i]);
    if (!fid) continue;
    try {
      var blob = DriveApp.getFileById(fid).getBlob();
      parts.push({
        inline_data: {
          mime_type: blob.getContentType(),
          data: Utilities.base64Encode(blob.getBytes())
        }
      });
    } catch (e) { Logger.log('Gambar skip: ' + e.message); }
  }

  var model = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-2.0-flash';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
  var payload = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
  };

  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var json = JSON.parse(resp.getContentText());
    if (code !== 200) throw new Error(json.error && json.error.message ? json.error.message : resp.getContentText());

    var text = '';
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
      text = json.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
    }
    var parsed = parseGeminiJson_(text);
    if (parsed) return parsed;
    return { dapatan: text, rumusan: buildFallbackRumusan_(row, nota), refleksi: buildFallbackRefleksi_(row, nota) };
  } catch (err) {
    Logger.log('Gemini: ' + err.message);
    return {
      dapatan: buildFallbackDapatan_(row, nota),
      rumusan: buildFallbackRumusan_(row, nota),
      refleksi: buildFallbackRefleksi_(row, nota)
    };
  }
}

function parseGeminiJson_(text) {
  if (!text) return null;
  var m = text.match(/\{[\s\S]*"dapatan"[\s\S]*\}/);
  if (!m) return null;
  try {
    var o = JSON.parse(m[0]);
    if (o.dapatan && o.rumusan) {
      return {
        dapatan: o.dapatan,
        rumusan: o.rumusan,
        refleksi: o.refleksi || ''
      };
    }
  } catch (e) { /* */ }
  return null;
}

function buildFallbackDapatan_(row, nota) {
  return 'Program/aktiviti berkaitan "' + (row.urusan || '') + '" telah dijalankan di ' + (row.lokasi || '') +
    ' pada ' + (row.tarikh_pergi || '') + '. ' + (nota ? 'Nota: ' + nota : '');
}

function buildFallbackRumusan_(row, nota) {
  return 'Aktiviti ini menyokong pelaksanaan fungsi ' + (row.sektor || 'PPD Manjung') +
    ' dan memberi impak positif kepada pelaksanaan program di peringkat daerah.';
}

function buildFallbackRefleksi_(row, nota) {
  var s = 'Refleksi: Pelaksanaan program perlu diperkukuh dari segi perancangan dan komunikasi. ';
  s += 'Tindakan susulan: Pemantauan berkala dan perkongsian amalan baik dengan unit berkaitan. ';
  if (nota) s += 'Nota pegawai: ' + nota;
  return s;
}

function insertPhotosIntoDoc_(body, photoFileIds) {
  for (var i = 0; i < 5; i++) {
    var tag = '{{GAMBAR_' + (i + 1) + '}}';
    var filled = false;
    if (i < photoFileIds.length) {
      var fid = extractDriveId_(photoFileIds[i]);
      if (fid) {
        try {
          var blob = DriveApp.getFileById(fid).getBlob();
          var found = body.findText(tag);
          if (found) {
            var el = found.getElement();
            var parent = el.getParent();
            var idx = parent.getChildIndex(el);
            parent.insertInlineImage(idx, blob);
            el.removeFromParent();
            filled = true;
          }
        } catch (e) { Logger.log(e); }
      }
    }
    if (!filled) body.replaceText(tag, '');
  }
}

function getPergerakanRowById_(id) {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var data = sh.getDataRange().getValues();
  var C = EGerakConfig.PERGERAKAN_COLS;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][C.ID]) === String(id)) {
      return {
        _rowIndex: i + 1,
        id: data[i][C.ID],
        email: data[i][C.EMAIL],
        nama: data[i][C.NAMA],
        jawatan: data[i][C.JAWATAN],
        sektor: data[i][C.SEKTOR],
        urusan: data[i][C.URUSAN],
        lokasi: data[i][C.LOKASI],
        tarikh_pergi: data[i][C.TARIKH_PERGI],
        tarikh_kembali: data[i][C.TARIKH_KEMBALI],
        dapatan_draft: data[i][C.DAPATAN_DRAFT],
        rumusan_draft: data[i][C.RUMUSAN_DRAFT],
        refleksi_draft: data[i][C.REFLEKSI_DRAFT],
        opr_file_url: data[i][C.OPR_FILE_URL]
      };
    }
  }
  return null;
}

function uploadOprPhoto(base64Data, filename, mimeType) {
  requireAuthUser_();
  var rootId = EGerakConfig.PHOTO_ARCHIVE_ROOT_FOLDER_ID ||
    PropertiesService.getScriptProperties().getProperty('EGerak_PHOTO_ROOT');
  var folder = rootId ? getDriveFolderSafe_(rootId, 'Arkib gambar') : DriveApp.getRootFolder();
  var monthFolder = getOrCreateMonthFolder_(folder, new Date());
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType || 'image/jpeg', filename || 'opr.jpg');
  var file = monthFolder.createFile(blob);
  return { fileId: file.getId(), url: file.getUrl() };
}
