/**
 * Salin templat OPR → Google Docs (boleh ganti placeholder)
 * .docx / Word mesti ditukar — DocumentApp tidak boleh edit .docx terus.
 */

var GOOGLE_DOC_MIME_ = 'application/vnd.google-apps.document';

function isGoogleDocMime_(mime) {
  return mime === GOOGLE_DOC_MIME_ || mime === MimeType.GOOGLE_DOCS;
}

/**
 * Salin templat ke folder destinasi; pulangkan ID fail Google Docs.
 */
function copyOprFromTemplate_(templateId, copyName, destFolder) {
  var templateFile = getDriveFileSafe_(templateId, 'Templat OPR');
  var mime = templateFile.getMimeType();

  if (isGoogleDocMime_(mime)) {
    var copy = templateFile.makeCopy(copyName, destFolder);
    Utilities.sleep(1500);
    return copy.getId();
  }

  return copyWordTemplateAsGoogleDoc_(templateId, copyName, destFolder);
}

function copyWordTemplateAsGoogleDoc_(templateId, copyName, destFolder) {
  try {
    if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.copy) {
      throw new Error('Drive API (lanjutan) tidak aktif');
    }
    var resource = {
      title: copyName,
      parents: [{ id: destFolder.getId() }],
      mimeType: GOOGLE_DOC_MIME_
    };
    var copied = Drive.Files.copy(resource, templateId, { convert: true });
    Utilities.sleep(2500);
    return copied.id;
  } catch (e) {
    throw new Error(
      'Templat OPR anda ialah Word (.docx). DocumentApp tidak boleh mengisi {{NAMA}} dll dalam .docx. ' +
      'Pilih SATU: (A) Buka templat di Drive → Fail → Simpan sebagai Google Dokumen → guna ID baharu dalam EGerak_OPR_TEMPLATE_DOC_ID. ' +
      '(B) Apps Script → Perkhidmatan → tambah Google Drive API → deploy semula. ' +
      'Ralat: ' + e.message
    );
  }
}

function openGoogleDocumentSafe_(docId) {
  var lastErr = null;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) Utilities.sleep(2000 * attempt);
    try {
      var doc = DocumentApp.openById(docId);
      doc.getBody();
      return doc;
    } catch (e) {
      lastErr = e;
      Logger.log('openGoogleDocumentSafe_ percubaan ' + (attempt + 1) + ': ' + e.message);
    }
  }
  throw new Error(
    'Dokumen tidak dapat dibuka untuk ganti placeholder (The document is inaccessible). ' +
    'Pastikan templat ialah Google Docs (bukan .docx) dan anda ada akses Editor. ' +
    (lastErr ? lastErr.message : '')
  );
}
