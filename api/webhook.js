/* ==========================================================================
   ModularBox — Webhook de MercadoPago (confirmación automática de pago)
   ==========================================================================
   POST /api/webhook
   MercadoPago lo llama cuando un pago cambia de estado. Este script:

   1. Pide el pago a la API de MercadoPago (para verificar que es real).
   2. Si el pago está APROBADO, recién ahí inserta los folios en "compras"
      (una fila por ticket) y marca la orden como "pagado".
   3. Si un pago ya confirmado se REVIERTE (reembolso, cargo no deseado o
      rechazo posterior), elimina los tickets de "compras" para que NO
      cuenten en el sorteo y marca la orden como "rechazado".

   En MercadoPago: Tus integraciones → Webhooks → URL: https://<tu-sitio>/api/webhook
   ========================================================================== */

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

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

/* Pide el pago a MercadoPago y lo confirma si está aprobado. */
async function confirmarPago(paymentId) {
  var resp = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    headers: mpHeaders()
  });
  if (!resp.ok) return;
  var pago = await resp.json().catch(function () { return null; });
  if (!pago || !pago.id) return;

  var ref = pago.external_reference;
  if (!ref) return;

  var q = await fetch(process.env.SUPABASE_URL + "/rest/v1/ordenes?select=*&orden=eq." + encodeURIComponent(ref), {
    headers: sbHeaders()
  });
  var rows = await q.json().catch(function () { return []; });
  var ordenRow = Array.isArray(rows) ? rows[0] : null;
  if (!ordenRow) return;

  var estado = "pendiente";
  if (pago.status === "approved") estado = "pagado";
  else if (pago.status === "rejected" || pago.status === "cancelled"
        || pago.status === "refunded" || pago.status === "charged_back") estado = "rechazado";

  if (ordenRow.estado === estado) return;

  /* Pago aprobado: insertar una fila por folio en "compras".
     Cada fila es UN ticket: descripción "1 ticket" y el total repartido
     proporcionalmente (para que la suma de la orden cuadre). */
  if (estado === "pagado") {
    var folios = ordenRow.folios || [];
    var n = folios.length || 1;
    var base = Math.floor(ordenRow.total / n);
    var resto = ordenRow.total - base * n;
    var filas = folios.map(function (folio, i) {
      return {
        orden: ref,
        folio: folio,
        nombre: ordenRow.nombre,
        correo: ordenRow.correo,
        telefono: ordenRow.telefono,
        tickets: "1 ticket",
        total: i === n - 1 ? base + resto : base
      };
    });
    await fetch(process.env.SUPABASE_URL + "/rest/v1/compras", {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify(filas)
    }).catch(function () {});
  }

  /* Reversión: el pago ya confirmado se revirtió (reembolso/cargo no
     deseado). Se eliminan los tickets para que NO cuenten en el sorteo. */
  if (estado === "rechazado" && ordenRow.estado === "pagado") {
    console.log("[webhook] Reversión de pago, se anulan los tickets de la orden", ref);
    await fetch(process.env.SUPABASE_URL + "/rest/v1/compras?orden=eq." + encodeURIComponent(ref), {
      method: "DELETE",
      headers: sbHeaders()
    }).catch(function () {});
  }

  await fetch(process.env.SUPABASE_URL + "/rest/v1/ordenes?orden=eq." + encodeURIComponent(ref), {
    method: "PATCH",
    headers: sbHeaders(),
    body: JSON.stringify({ estado: estado, mp_payment_id: String(paymentId) })
  }).catch(function () {});
}

/* Las órdenes de MercadoPago agrupan pagos: confirmamos cada uno. */
async function confirmarMerchantOrder(orderId) {
  var resp = await fetch("https://api.mercadopago.com/v1/merchant_orders/" + encodeURIComponent(orderId), {
    headers: mpHeaders()
  });
  if (!resp.ok) return;
  var data = await resp.json().catch(function () { return null; });
  if (!data || !Array.isArray(data.payments)) return;
  for (var i = 0; i < data.payments.length; i++) {
    if (data.payments[i] && data.payments[i].id) {
      await confirmarPago(String(data.payments[i].id));
    }
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  var body = req.body || {};
  var data = body.data || {};

  try {
    if (body.type === "merchant_order" && data.id) {
      await confirmarMerchantOrder(String(data.id));
    } else if (data.id) {
      await confirmarPago(String(data.id));
    }
  } catch (err) {
    /* Respondemos 200 igual para que MercadoPago no reintente en bucle. */
  }

  res.status(200).json({ ok: true });
}
