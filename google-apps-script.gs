/* ==========================================================================
   ModularBox — Google Apps Script
   ==========================================================================
   Maneja dos tipos de solicitudes:
   1. Registro de compras del sorteo → se guarda en hoja "Compras"
   2. Solicitudes de cotización → se envía email a ventas@modularbox.cl
      y se guarda en hoja "Cotizaciones"

   CÓMO INSTALARLO (5 minutos):
   1. Ve a https://sheets.new y crea una planilla de Google.
   2. Menú: Extensiones > Apps Script.
   3. Borra el contenido del editor y pega TODO este archivo.
   4. En el menú "Implementar" (o "Deploy") elige "Nueva implementación" >
      "Aplicación web".
      - Ejecutar como: "Yo" (tu cuenta).
      - Quién tiene acceso: "Cualquiera".
      - Haz clic en "Implementar" y copia la URL (termina en /exec).
   5. Pega esa URL en la variable COTIZACION_URL en js/main.js.
   ========================================================================== */

var EMAIL_DESTINO = "gustavo.soto.cardenas1994@gmail.com";
var SPREADSHEET_ID = "1gh9s1nYC7GpkdAe-zPUIceyhLiabluKC_1rXwqBzS7M";

function doPost(e) {
  var datos = {};
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta_(false, "JSON inválido");
  }

  var tipo = datos.tipo_solicitud || "";

  if (tipo === "cotizacion") {
    return procesarCotizacion_(datos);
  }

  return procesarCompra_(datos);
}

/* GET sirve para probar la URL desde el navegador */
function doGet() {
  return respuesta_(true, "El script está funcionando");
}

/* OPTIONS: respuesta CORS para preflight del navegador */
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ---------- Cotización ---------- */
function procesarCotizacion_(datos) {
  var nombre = datos.nombre || "";
  var correo = datos.correo || "";

  if (!nombre.trim() || !correo.trim()) {
    return respuesta_(false, "Nombre y correo son requeridos");
  }

  if (!correo.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return respuesta_(false, "Correo inválido");
  }

  var apellido = datos.apellido || "";
  var telefono = datos.telefono || "-";
  var tipoNecesidad = datos.necesidad || "-";
  var metros = datos.metros || "-";
  var mensaje = datos.mensaje || "-";
  var fecha = datos.fecha || new Date().toLocaleString("es-CL");

  /* Guardar en hoja "Cotizaciones" */
  var sheet;
  try {
    sheet = getCotizacionesSheet_();
  } catch (err) {
    return respuesta_(false, "Error al acceder hoja: " + err.message);
  }
  try {
    sheet.appendRow([fecha, nombre, apellido, correo, telefono, tipoNecesidad, metros, mensaje]);
  } catch (err) {
    return respuesta_(false, "Error al guardar en hoja: " + err.message);
  }

  /* Enviar email */
  var asunto = "Nueva solicitud de cotización — " + tipoNecesidad;
  var cuerpo = ""
    + "NUEVA SOLICITUD DE COTIZACIÓN\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    + "Nombre:    " + nombre + " " + apellido + "\n"
    + "Correo:    " + correo + "\n"
    + "Teléfono:  " + telefono + "\n\n"
    + "Qué necesita:  " + tipoNecesidad + "\n"
    + "Metraje:       " + metros + " m²\n\n"
    + "Mensaje:\n" + mensaje + "\n\n"
    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    + "Enviado desde modular-box.vercel.app";

  try {
    GmailApp.sendEmail(EMAIL_DESTINO, asunto, cuerpo, {
      replyTo: correo,
      name: "ModularBox Web"
    });
  } catch (err) {
    return respuesta_(false, "Error al enviar email: " + err.message);
  }

  return respuesta_(true, "Cotización enviada");
}

/* ---------- Compra del sorteo ---------- */
function procesarCompra_(datos) {
  var nombre = datos.nombre || "";
  var correo = datos.correo || "";

  if (!nombre.trim() || !correo.trim()) {
    return respuesta_(false, "Nombre y correo son requeridos");
  }

  if (!correo.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return respuesta_(false, "Correo inválido");
  }

  var sheet;
  try {
    sheet = getComprasSheet_();
  } catch (err) {
    return respuesta_(false, "Error al acceder hoja: " + err.message);
  }

  try {
    sheet.appendRow([
      datos.fecha || new Date().toLocaleString(),
      datos.folio || "-",
      nombre,
      correo,
      datos.telefono || "-",
      datos.tickets || "-",
      datos.total || "-",
      datos.referencia || "-"
    ]);
  } catch (err) {
    return respuesta_(false, "Error al guardar en hoja: " + err.message);
  }

  return respuesta_(true, "Registrado");
}

/* ---------- Hojas ---------- */
function getSpreadsheet_() {
  if (!SPREADSHEET_ID) {
    throw new Error("Falta configurar SPREADSHEET_ID en el script");
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getCotizacionesSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName("Cotizaciones");
  if (!sheet) {
    sheet = ss.insertSheet("Cotizaciones");
    sheet.appendRow(["Fecha", "Nombre", "Apellido", "Correo", "Teléfono", "Necesidad", "Metros", "Mensaje"]);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:H1").setFontWeight("bold").setBackground("#4CAF50").setFontColor("#fff");
  }
  return sheet;
}

function getComprasSheet_() {
  var ss = getSpreadsheet_();
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
function probarFormulario() {
  var e = {
    postData: {
      contents: JSON.stringify({
        tipo_solicitud: "cotizacion",
        nombre: "Prueba",
        apellido: "Test",
        correo: "gustavo.soto.cardenas1994@gmail.com",
        telefono: "123456",
        necesidad: "Oficina",
        metros: "50",
        mensaje: "Prueba de formulario"
      })
    }
  };
  var resultado = doPost(e);
  Logger.log(resultado.getContent());
}

function diagnosticarSheet() {
  try {
    var ss = getSpreadsheet_();
    Logger.log("Spreadsheet ID: " + ss.getId());
    Logger.log("Spreadsheet nombre: " + ss.getName());
    
    var sheet = ss.getSheetByName("Cotizaciones");
    if (sheet) {
      Logger.log("Hoja 'Cotizaciones' encontrada");
      Logger.log("Filas: " + sheet.getLastRow());
    } else {
      Logger.log("Hoja 'Cotizaciones' NO existe - se creará");
    }
  } catch (err) {
    Logger.log("ERROR: " + err.message);
  }
}