/* ==========================================================================
   ModularBox — Iniciar un cobro (Checkout Pro de MercadoPago)
   ==========================================================================
   POST /api/checkout
   Body: { nombre, correo, telefono, tickets: "1" | "3" }

   1. Genera la orden + folios y los guarda como PENDIENTES en Supabase.
   2. Crea una preferencia de pago en MercadoPago.
   3. Devuelve { init_point, orden } para mandar al cliente a pagar.

   Requiere en Vercel (Environment Variables):
   - MP_ACCESS_TOKEN            (MercadoPago, secreto)
   - SUPABASE_URL               (Project URL de Supabase)
   - SUPABASE_SERVICE_ROLE_KEY  (service_role de Supabase, secreto)
   ========================================================================== */

var MP_API = "https://api.mercadopago.com";

function pad(n) { return String(n).padStart(2, "0"); }

function makeFolio(d) {
  var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var r = "";
  for (var i = 0; i < 4; i++) {
    r += chars[Math.floor(Math.random() * chars.length)];
  }
  return "MB-" + ymd + "-" + r;
}

function makeOrden(d) {
  return "MB-ORD-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
    + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
    + "-" + Math.floor(Math.random() * 90 + 10);
}

function mpHeaders() {
  return {
    Authorization: "Bearer " + (process.env.MP_ACCESS_TOKEN || ""),
    "Content-Type": "application/json"
  };
}

function sbHeaders() {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

function siteUrlFrom(req) {
  if (process.env.PUBLIC_SITE_URL) {
    return String(process.env.PUBLIC_SITE_URL).replace(/\/+$/, "");
  }
  var proto = req.headers["x-forwarded-proto"] || "https";
  var host = req.headers["x-forwarded-host"] || req.headers.host;
  return proto + "://" + host;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  var nombre = String(req.body.nombre || "").trim();
  var correo = String(req.body.correo || "").trim().toLowerCase();
  var telefono = String(req.body.telefono || "").trim();
  var tickets = String(req.body.tickets || "");

  if (!nombre || !correo || !telefono || (tickets !== "1" && tickets !== "3")) {
    return res.status(400).json({ error: "Faltan datos o son inválidos." });
  }

  var cantidad = tickets === "3" ? 3 : 1;
  var total = tickets === "3" ? 10000 : 5000;
  var detalle = tickets === "3" ? "3 tickets (promo)" : "1 ticket";

  var ahora = new Date();
  var orden = makeOrden(ahora);
  var folios = [];
  for (var i = 0; i < cantidad; i++) {
    folios.push(makeFolio(ahora));
  }

  /* 1) Guardar la orden como pendiente (los folios NO cuentan todavía). */
  var insertar = await fetch(process.env.SUPABASE_URL + "/rest/v1/ordenes", {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({
      orden: orden,
      estado: "pendiente",
      nombre: nombre,
      correo: correo,
      telefono: telefono,
      tickets: detalle,
      total: total,
      folios: folios
    })
  });
  if (!insertar.ok) {
    return res.status(500).json({ error: "No se pudo crear la orden. Intenta de nuevo." });
  }

  /* 2) Crear el cobro en MercadoPago. */
  var sitio = siteUrlFrom(req);
  var pref = await fetch(MP_API + "/checkout/preferences", {
    method: "POST",
    headers: mpHeaders(),
    body: JSON.stringify({
      items: [{
        title: detalle + " · Gran Sorteo ModularBox",
        quantity: 1,
        unit_price: total,
        currency_id: "CLP"
      }],
      payer: { email: correo },
      external_reference: orden,
      back_urls: {
        success: sitio + "/participar.html?resultado=pago&orden=" + orden,
        pending: sitio + "/participar.html?resultado=pendiente&orden=" + orden,
        failure: sitio + "/participar.html?resultado=fallo&orden=" + orden
      },
      auto_return: "approved",
      notification_url: sitio + "/api/webhook"
    })
  });
  var prefData = await pref.json().catch(function () { return {}; });

  if (!pref.ok || !prefData.init_point) {
    console.error("[checkout] MercadoPago error:", pref.status, JSON.stringify(prefData));
    var detalle = prefData && prefData.message
      ? prefData.message
      : (prefData && prefData.error ? prefData.error : "desconocido");
    return res.status(502).json({ error: "MercadoPago no pudo crear el pago.", detalle: detalle });
  }

  res.json({ init_point: prefData.init_point, orden: orden });
}
