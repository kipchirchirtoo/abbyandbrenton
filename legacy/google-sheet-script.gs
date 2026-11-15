// Paste this into Extensions > Apps Script in your Google Sheet.
// It adds one row per RSVP: Time | Name | Attending | Guests | Dietary | Message

const SHEET_NAME = 'RSVPs';

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Time', 'Name', 'Attending', 'Guests', 'Dietary', 'Message']);
    sh.setFrozenRows(1);
  }
  const d = JSON.parse(e.postData.contents);
  // Basic cleanup: cap lengths and stop spreadsheet formula injection
  const clean = v => {
    v = String(v || '').slice(0, 500);
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  };
  sh.appendRow([new Date(), clean(d.name), clean(d.attending), clean(d.guests), clean(d.diet), clean(d.msg)]);
  return ContentService.createTextOutput('ok');
}
