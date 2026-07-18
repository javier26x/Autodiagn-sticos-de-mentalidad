/* =============================================================================
 * Backend GRATUITO para juntar los resultados "en la web".
 * Google Apps Script + una Hoja de cálculo de Google que TÚ controlas.
 *
 * Pasos (una sola vez, ~5 minutos):
 *   1. Crea una Hoja de cálculo en https://sheets.google.com (vacía).
 *   2. Menú  Extensiones ▸ Apps Script.
 *   3. Borra lo que haya y pega TODO este archivo.
 *   4. Botón «Implementar» ▸ «Nueva implementación» ▸ tipo «Aplicación web».
 *        · Ejecutar como:  Yo
 *        · Quién tiene acceso:  Cualquier usuario
 *   5. Copia la URL que termina en /exec y pégala en config.js -> backendUrl.
 *
 * Los resultados llegan a la hoja "Resultados". Son anónimos: solo puntajes.
 * ========================================================================== */

var SHEET_NAME = 'Resultados';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet();
    sheet.appendRow([
      new Date(),
      toNum(data.m1),
      toNum(data.m2),
      String(data.band1 || ''),
      String(data.band2 || ''),
      toNum(data.gap),
      String(data.sex || ''),
      String(data.event || '')
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    var sheet = getSheet();
    var values = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row[1] === '' && row[2] === '') continue;
      results.push({
        m1: Number(row[1]),
        m2: Number(row[2]),
        band1: String(row[3] || ''),
        band2: String(row[4] || ''),
        gap: Number(row[5]),
        sex: String(row[6] || '')
      });
    }
    return json({ ok: true, count: results.length, results: results });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp', 'm1', 'm2', 'band1', 'band2', 'gap', 'sex', 'event']);
  }
  return sheet;
}

function toNum(x) {
  var n = Number(x);
  return isNaN(n) ? '' : n;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
