/**
 * eGerak PPD Manjung — Web App entry & API router
 */

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'app';
  if (page === 'api') {
    return handleApiGet_(e);
  }
  return HtmlService.createHtmlOutputFromFile('WebApp')
    .setTitle('eGerak PPD Manjung')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  return handleApiPost_(e);
}

function handleApiGet_(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    var result;
    switch (action) {
      case 'session':
        result = getSessionInfo();
        break;
      case 'stats':
        result = getDashboardStats();
        break;
      case 'senarai_hari':
        result = listPergerakanHariIni(e.parameter.date);
        break;
      case 'senarai_saya':
        result = listPergerakanSaya();
        break;
      default:
        result = { error: 'Unknown action' };
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

function handleApiPost_(e) {
  var body = {};
  try {
    body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return jsonResponse_({ error: 'Invalid JSON' });
  }
  var action = body.action || (e.parameter && e.parameter.action);
  try {
    var result;
    switch (action) {
      case 'submit':
        result = onSubmitPergerakan(body.payload || body);
        break;
      case 'delete':
        result = onDeletePergerakan(body.ids || []);
        break;
      case 'search':
        result = searchPergerakan(body.query);
        break;
      case 'opr_draft':
        result = generateOprDraft(body.pergerakanId, body.nota, body.photoFileIds);
        break;
      case 'opr_final':
        result = finalizeOpr(body.pergerakanId, body.dapatan, body.rumusan, body.refleksi, body.photoFileIds);
        break;
      case 'upload_photo':
        result = uploadOprPhoto(body.base64, body.filename, body.mimeType);
        break;
      case 'import_bulk':
        result = importBulk();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ error: err.message });
  }
}

/** Dipanggil dari google.script.run dalam Web App */
function apiSession() { return getSessionInfo(); }
function apiStats() { return getDashboardStats(); }
function apiSenaraiHari(dateStr) { return listPergerakanHariIni(dateStr); }
function apiSenaraiSaya() { return listPergerakanSaya(); }
function apiSubmit(payload) { return onSubmitPergerakan(payload); }
function apiDelete(ids) { return onDeletePergerakan(ids); }
function apiSearch(q) { return searchPergerakan(q); }
function apiOprDraft(id, nota, photos) { return generateOprDraft(id, nota, photos); }
function apiOprFinal(id, dapatan, rumusan, refleksi, photos) { return finalizeOpr(id, dapatan, rumusan, refleksi, photos); }
function apiUploadPhoto(b64, name, mime) { return uploadOprPhoto(b64, name, mime); }

function reconcileCalendarsDaily() {
  var sh = getSheet_(EGerakConfig.SHEETS.PERGERAKAN);
  var data = sh.getDataRange().getValues();
  var C = EGerakConfig.PERGERAKAN_COLS;
  var issues = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][C.AKTIF]).toUpperCase() === 'FALSE') continue;
    var ids = data[i][C.CALENDAR_EVENT_IDS];
    if (!ids || String(ids).trim() === '') {
      issues.push({ row: i + 1, id: data[i][C.ID], issue: 'missing_calendar_ids' });
    }
  }
  if (issues.length > 0) {
    var admin = PropertiesService.getScriptProperties().getProperty('EGerak_ADMIN_EMAIL') || '';
    if (admin) {
      MailApp.sendEmail(admin, 'eGerak: Isu sync kalendar', JSON.stringify(issues, null, 2));
    }
  }
  auditLog_('RECONCILE', { count: issues.length }, 'system');
}
