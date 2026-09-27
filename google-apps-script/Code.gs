/**
 * Gæstebog for aliogberfin.dk
 *
 * Opsætning
 * ---------
 * 1. Opret et Google Sheet med en fane, der hedder præcis: Gaestebog
 * 2. Række 1 skal indeholde overskrifterne:
 *      A: Tidspunkt   B: Navn   C: Hilsen   D: Godkendt   E: Browser
 * 3. Udvidelser -> Apps Script, indsæt denne kode.
 * 4. Projektindstillinger -> Scriptegenskaber -> tilføj:
 *      SHARED_SECRET = <en lang, tilfældig streng>
 * 5. Udrul -> Ny udrulning -> Webapp
 *      Kør som: mig
 *      Hvem har adgang: Alle
 * 6. Kopier webapp-URL'en. Sæt i Netlify:
 *      APPS_SCRIPT_URL    = webapp-URL'en
 *      APPS_SCRIPT_SECRET = samme streng som SHARED_SECRET
 *
 * Moderation: sæt SANDT i kolonne D (Godkendt) for at vise en hilsen på siden.
 */

var SHEET_NAME = 'Gaestebog';
var MAX_NAME = 80;
var MAX_MESSAGE = 800;

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
}

function getSheet_() {
  return SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Henter godkendte hilsner, nyeste først. */
function doGet(e) {
  var expected = getSecret_();
  var provided = e && e.parameter ? e.parameter.secret : null;
  if (!expected || provided !== expected) {
    return jsonOutput_({ error: 'unauthorized' });
  }

  var sheet = getSheet_();
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOutput_({ entries: [] });
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();

  var entries = [];
  for (var i = 0; i < rows.length; i++) {
    var approved = rows[i][3];
    var isApproved =
      approved === true ||
      String(approved).toUpperCase() === 'TRUE' ||
      String(approved).toUpperCase() === 'SANDT';

    if (!isApproved) continue;

    entries.push({
      date: rows[i][0] instanceof Date ? rows[i][0].toISOString() : '',
      name: String(rows[i][1]),
      message: String(rows[i][2]),
    });
  }

  entries.reverse();
  return jsonOutput_({ entries: entries });
}

/** Tilføjer en ny hilsen. Den er ikke godkendt som udgangspunkt. */
function doPost(e) {
  var expected = getSecret_();
  var body;

  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ error: 'bad_request' });
  }

  if (!expected || body.secret !== expected) {
    return jsonOutput_({ error: 'unauthorized' });
  }

  var name = String(body.name || '')
    .trim()
    .slice(0, MAX_NAME);
  var message = String(body.message || '')
    .trim()
    .slice(0, MAX_MESSAGE);

  if (!name || !message) {
    return jsonOutput_({ error: 'missing_fields' });
  }

  var sheet = getSheet_();
  if (!sheet) {
    return jsonOutput_({ error: 'sheet_missing' });
  }

  // Lås, så to samtidige indsendelser ikke skriver i samme række.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow([
      new Date(),
      name,
      message,
      false,
      String(body.userAgent || '').slice(0, 200),
    ]);
  } finally {
    lock.releaseLock();
  }

  return jsonOutput_({ ok: true });
}
