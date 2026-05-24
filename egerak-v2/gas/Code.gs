/**
 * eGerak v2 — Muat naik gambar OPR ke Google Drive (PPD)
 *
 * 1. Salin skrip ini ke https://script.google.com (projek baharu)
 * 2. Jalankan sekali: setupScriptProperties() — isi FOLDER_ID & UPLOAD_SECRET di bawah
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL /exec ke GAS_WEB_APP_URL dalam .env.local
 */

/** Tukar nilai ini, kemudian jalankan setupScriptProperties() sekali dari editor */
var SETUP_FOLDER_ID = "ISI_FOLDER_ID_DRIVE_DI_SINI";
var SETUP_UPLOAD_SECRET = "ISI_RENTETAN_RAWAK_PANJANG_DI_SINI";

function setupScriptProperties() {
  if (
    SETUP_FOLDER_ID.indexOf("ISI_") === 0 ||
    SETUP_UPLOAD_SECRET.indexOf("ISI_") === 0
  ) {
    throw new Error("Sila edit SETUP_FOLDER_ID dan SETUP_UPLOAD_SECRET dalam Code.gs dahulu.");
  }
  PropertiesService.getScriptProperties().setProperties({
    FOLDER_ID: SETUP_FOLDER_ID,
    UPLOAD_SECRET: SETUP_UPLOAD_SECRET,
  });
  Logger.log("OK — Script Properties disimpan.");
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("FOLDER_ID");
  var secret = props.getProperty("UPLOAD_SECRET");
  if (!folderId || !secret) {
    throw new Error("Jalankan setupScriptProperties() dahulu.");
  }
  return { folderId: folderId, secret: secret };
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: "Bad request: tiada JSON body" });
    }

    var payload = JSON.parse(e.postData.contents);
    var config = getConfig_();

    if (payload.secret !== config.secret) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }

    if (!payload.dataBase64 || !payload.fileName) {
      return jsonResponse_({ ok: false, error: "dataBase64 dan fileName diperlukan" });
    }

    var bytes = Utilities.base64Decode(payload.dataBase64);
    if (bytes.length > 8 * 1024 * 1024) {
      return jsonResponse_({ ok: false, error: "Fail melebihi 8 MB" });
    }

    var mimeType = payload.mimeType || "application/octet-stream";
    var blob = Utilities.newBlob(bytes, mimeType, payload.fileName);
    var folder = DriveApp.getFolderById(config.folderId);
    var file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    // thumbnail URL — boleh dipapar dalam <img> (bukan uc?export=view)
    var publicUrl =
      "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(fileId) +
      "&sz=w1200";

    return jsonResponse_({
      ok: true,
      fileId: fileId,
      path: "drive/" + fileId,
      publicUrl: publicUrl,
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

/** Ujian manual dari editor: Run → testUpload */
function testUpload() {
  var config = getConfig_();
  var tiny =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  var e = {
    postData: {
      contents: JSON.stringify({
        secret: config.secret,
        oprId: 0,
        fileName: "test-pixel.png",
        mimeType: "image/png",
        dataBase64: tiny,
      }),
    },
  };
  var out = doPost(e);
  Logger.log(out.getContent());
}
