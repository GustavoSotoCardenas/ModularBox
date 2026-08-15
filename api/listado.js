/* ==========================================================================
   ModularBox — Listado de tickets confirmados (para el sorteo)
   ==========================================================================
   GET /api/listado?clave=TU_CLAVE
   Devuelve un CSV con todos los tickets confirmados (solo pagos vigentes),
   ordenados por número correlativo. La clave debe coincidir con la variable
   ADMIN_KEY de Vercel (así los datos personales no quedan públicos).
   ========================================================================== */

function sbHeaders() {
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
}

function csvCell(v) {
  var s = String(v == null ? "" : v);
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  var clave = String(req.query.clave || "");
  if (!process.env.ADMIN_KEY || clave !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Clave inválida." });
  }

  var q = await fetch(process.env.SUPABASE_URL + "/rest/v1/compras?select=numero,folio,orden,nombre,correo,telefono,total,fecha&order=numero.asc", {
    headers: sbHeaders()
  });
  var rows = await q.json().catch(function () { return []; });
  if (!Array.isArray(rows)) rows = [];

  var header = ["N", "Folio", "Orden", "Nombre", "Correo", "Telefono", "Total", "Fecha"];
  var lines = rows.map(function (r) {
    return [r.numero, r.folio, r.orden, r.nombre, r.correo, r.telefono, r.total, r.fecha]
      .map(csvCell).join(",");
  });
  var csv = header.join(",") + "\n" + lines.join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="tickets-sorteo.csv"');
  res.status(200).send(csv);
}
