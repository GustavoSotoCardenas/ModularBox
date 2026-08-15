/* ==========================================================================
   ModularBox — Registro de compras en Google Sheets
   ==========================================================================
   CÓMO INSTALARLO (5 minutos):
   1. Ve a https://sheets.new y crea una planilla de Google.
   2. Menú: Extensiones > Apps Script.
   3. Borra el contenido del editor y pega TODO este archivo.
   4. En el menú "Implementar" (o "Deploy") elige "Nueva implementación" >
      "Aplicación web".
      - Ejecutar como: "Yo" (tu cuenta).
      - Quién tiene acceso: "Cualquiera".
      - Haz clic en "Implementar" y copia la URL (termina en /exec).
   5. Pega esa URL en js/main.js en la variable SHEET_URL.
   Cada compra que se registre en la web se sumará como una fila nueva.
   ========================================================================== */

function doPost(e) {
  var sheet = getSheet_();

  var datos = {};
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta_(false, "JSON inválido");
  }

  sheet.appendRow([
    datos.fecha || new Date().toLocaleString(),
    datos.folio || "-",
    datos.nombre || "-",
    datos.correo || "-",
    datos.telefono || "-",
    datos.tickets || "-",
    datos.total || "-",
    datos.referencia || "-"
  ]);

  return respuesta_(true, "Registrado");
}

/* GET sirve para probar la URL desde el navegador */
function doGet() {
  return respuesta_(true, "El script está funcionando");
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Compras");
  if (!sheet) {
    sheet = ss.insertSheet("Compras");
    sheet.appendRow(["Fecha", "Folio", "Nombre", "Correo", "Teléfono", "Tickets", "Total", "Referencia de pago"]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#fc0");
  }
  return sheet;
}

function respuesta_(ok, msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, msg: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
