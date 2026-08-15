/* ==========================================================================
   ModularBox — Estado de una orden (para confirmar el pago en pantalla)
   ==========================================================================
   GET /api/verificar?orden=MB-ORD-...
   Devuelve { estado: "pendiente"|"pagado"|"rechazado", folios: [...] }
   ========================================================================== */

function sbHeaders() {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  var orden = String(req.query.orden || "").trim();
  if (!orden) return res.status(400).json({ error: "Falta la orden." });

  var q = await fetch(process.env.SUPABASE_URL + "/rest/v1/ordenes?select=estado,folios,fecha,nombre,correo,telefono,tickets,total&orden=eq." + encodeURIComponent(orden), {
    headers: sbHeaders()
  });
  var rows = await q.json().catch(function () { return []; });
  var row = Array.isArray(rows) ? rows[0] : null;

  if (!row) return res.json({ estado: "no-existe", folios: [] });

  /* Número correlativo de cada ticket confirmado de esta orden. */
  var numeros = [];
  var fechaPago = null;
  if (row.estado === "pagado") {
    var qc = await fetch(process.env.SUPABASE_URL + "/rest/v1/compras?select=numero,folio,fecha&orden=eq." + encodeURIComponent(orden) + "&order=numero.asc", {
      headers: sbHeaders()
    });
    var compras = await qc.json().catch(function () { return []; });
    compras = Array.isArray(compras) ? compras : [];
    numeros = compras.map(function (c) { return { numero: c.numero, folio: c.folio }; });
    if (compras[0] && compras[0].fecha) fechaPago = compras[0].fecha;
  }

  res.json({
    estado: row.estado,
    folios: row.folios || [],
    numeros: numeros,
    nombre: row.nombre,
    correo: row.correo,
    telefono: row.telefono,
    tickets: row.tickets,
    total: row.total,
    fecha: row.fecha,
    fechaPago: fechaPago
  });
}
