/* ==========================================================================
   ModularBox — Proxy de solicitudes de cotización
   ==========================================================================
   POST /api/cotizacion
   Body: { nombre, apellido, correo, telefono, necesidad, metros, mensaje }

   Reenvía los datos al Google Apps Script (server-to-server, sin problema
   de CORS) y devuelve al navegador el resultado REAL ({ ok: true|false }).
   Esto reemplaza el fetch directo con mode:"no-cors" que había en
   js/main.js, el cual mostraba "enviado con éxito" sin importar si el
   Apps Script realmente guardó o no la solicitud.

   Requiere en Vercel (Environment Variables):
   - COTIZACION_GAS_URL   URL /exec del Google Apps Script (ver google-apps-script.gs)
   ========================================================================== */

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });

  var gasUrl = process.env.COTIZACION_GAS_URL || "";
  if (!gasUrl) {
    console.error("[cotizacion] Falta configurar COTIZACION_GAS_URL en Vercel.");
    return res.status(500).json({ ok: false, error: "El formulario no está configurado. Escríbenos por WhatsApp." });
  }

  var body = req.body || {};
  var nombre = String(body.nombre || "").trim();
  var correo = String(body.correo || "").trim().toLowerCase();

  if (!nombre || !correo) {
    return res.status(400).json({ ok: false, error: "Nombre y correo son requeridos." });
  }
  if (!EMAIL_RE.test(correo)) {
    return res.status(400).json({ ok: false, error: "Ingresa un correo válido." });
  }

  var datos = {
    tipo_solicitud: "cotizacion",
    nombre: nombre,
    apellido: String(body.apellido || "").trim(),
    correo: correo,
    telefono: String(body.telefono || "").trim(),
    necesidad: String(body.necesidad || "").trim(),
    metros: String(body.metros || "").trim(),
    mensaje: String(body.mensaje || "").trim(),
    fecha: new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })
  };

  var gasResp;
  try {
    gasResp = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos)
    });
  } catch (err) {
    console.error("[cotizacion] Error de red al llamar al Apps Script:", err.message);
    return res.status(502).json({ ok: false, error: "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." });
  }

  var text = await gasResp.text().catch(function () { return ""; });
  var data = {};
  try { data = JSON.parse(text); } catch (err) { data = {}; }

  if (!gasResp.ok) {
    console.error("[cotizacion] Apps Script respondió con error HTTP:", gasResp.status, text);
    return res.status(502).json({ ok: false, error: "No pudimos guardar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." });
  }

  /* El Apps Script devuelve { ok: true/false, msg: "..." }.
     Si no pudimos parsear su respuesta como JSON, igual llegó HTTP 200,
     así que asumimos que se guardó (Apps Script a veces devuelve HTML
     de login si el despliegue tiene mal los permisos de acceso). */
  if (data && data.ok === false) {
    console.error("[cotizacion] Apps Script reportó fallo:", data.msg);
    return res.status(502).json({ ok: false, error: data.msg || "No pudimos guardar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." });
  }
  if (!text || /accounts\.google\.com|<html/i.test(text)) {
    console.error("[cotizacion] Respuesta inesperada del Apps Script (posible problema de permisos del despliegue):", text.slice(0, 300));
    return res.status(502).json({ ok: false, error: "No pudimos guardar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp." });
  }

  return res.json({ ok: true });
}