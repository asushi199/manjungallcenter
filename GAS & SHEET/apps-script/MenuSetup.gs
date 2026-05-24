/**
 * Menu eGerak pada Master Spreadsheet.
 * Projek clasp biasanya "standalone" — onOpen() ringkas tidak jalan bila buka sheet.
 * Jalankan sekali: installSpreadsheetMenuTrigger() dari script.google.com
 */

function onOpenEgerakMenu_() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('eGerak')
    .addItem('Import Rancangan Tahunan', 'importBulkFromMenu')
    .addItem('Sync Kalendar (Sektor/TAKWIM/Bilik)', 'syncSharedCalendarsDeployer')
    .addItem('Pasang auto-sync kalendar (10 min)', 'installCalendarSyncTrigger')
    .addItem('Pasang menu eGerak (sekali)', 'installSpreadsheetMenuTrigger')
    .addItem('Setup Sheet (sekali)', 'setupMasterSpreadsheet')
    .addToUi();
}

/** Hanya berfungsi jika script sudah diikat pada spreadsheet (Extensions → Apps Script). */
function onOpen() {
  onOpenEgerakMenu_();
}

/**
 * Pasang pencetus onOpen pada Master Sheet (EGerak_SPREADSHEET_ID).
 * Wajib untuk projek standalone (clasp) supaya menu muncul bila buka sheet.
 */
function installSpreadsheetMenuTrigger() {
  var ssId = PropertiesService.getScriptProperties().getProperty('EGerak_SPREADSHEET_ID');
  if (!ssId) {
    throw new Error('EGerak_SPREADSHEET_ID belum ditetapkan dalam Script Properties.');
  }

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'onOpenEgerakMenu_') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('onOpenEgerakMenu_')
    .forSpreadsheet(ssId)
    .onOpen()
    .create();

  Logger.log('Menu eGerak: pencetus onOpen dipasang untuk spreadsheet ' + ssId);
  Logger.log('Tutup dan buka semula Master Sheet — menu eGerak akan muncul di bar menu.');
  return { ok: true, spreadsheetId: ssId };
}

/** Pasang menu + auto-sync kalendar (disyorkan sekali untuk USTP). */
function installEgerakSpreadsheetAutomation() {
  var menu = installSpreadsheetMenuTrigger();
  var cal = installCalendarSyncTrigger();
  return { menu: menu, calendarSync: cal };
}
