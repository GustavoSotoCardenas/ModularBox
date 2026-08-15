(function () {
  "use strict";

  /* ---------- CONFIGURACIÓN SUPABASE ----------
     Cómo activarla (2 minutos):
     1. Crea un proyecto gratis en https://supabase.com
     2. En tu proyecto, ve a "Project Settings > API" y copia el
        "Project URL" y la "anon public key". Pégalos abajo.
     3. Abre "SQL Editor", pega el contenido de supabase/schema.sql
        y ejecútalo (crea la tabla "compras" con su seguridad).
     Sin esto, el sitio sigue funcionando, pero NO se guardan las compras. */
  var SUPABASE_URL = "https://jctnzmzovfwwxbkcqikk.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdG56bXpvdmZ3d3hia2NxaWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NjQ2MjAsImV4cCI6MjEwMjM0MDYyMH0.MmXV3Ti8yAc0FnultsMfwBdqzkBn1RDCNU4eUoJVc-Q";

  /* ---------- Enlaces de pago de los tickets ----------
     Crea DOS enlaces de pago en MercadoPago, Flow, Khipu o Klip:
     uno de $5.000 (1 ticket) y otro de $10.000 (3 tickets).
     Pega cada URL abajo y el botón correspondiente los abrirá. */
  var TICKET_LINKS = {
    uno: "https://tu-enlace-1-ticket.com",
    tres: "https://tu-enlace-3-tickets.com"
  };

  /* Número donde te llega el aviso de cada participación por WhatsApp. */
  var WHATSAPP_NUMBER = "56988840060";

  var form = document.getElementById("participaForm");
  var status = document.getElementById("payStatus");
  var nombre = document.getElementById("pNombre");
  var correo = document.getElementById("pCorreo");
  var correoConfirm = document.getElementById("pCorreoConfirm");
  var telefono = document.getElementById("pTelefono");
  var payButtons = document.querySelectorAll(".pay-btn");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NAME_RE = /^[\p{L}\s.'-]{2,60}$/u;
  var PHONE_RE = /^(\+?56|0)?9\d{8}$/;

  var supabaseClient = null;
  if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function nameOk(v) { return NAME_RE.test(v.trim()); }

  function emailOk(v) { return EMAIL_RE.test(v.trim()); }

  function phoneOk(v) {
    var d = v.replace(/[\s()-]/g, "");
    return PHONE_RE.test(d);
  }

  function validate() {
    if (!nameOk(nombre.value)) {
      return "Ingresa tu nombre y apellido correctamente (solo letras).";
    }
    if (!emailOk(correo.value)) {
      return "Ingresa un correo válido, por ejemplo tucorreo@ejemplo.cl";
    }
    if (correo.value.trim().toLowerCase() !== correoConfirm.value.trim().toLowerCase()) {
      return "Los correos no coinciden. Revísalos.";
    }
    if (!phoneOk(telefono.value)) {
      return "Ingresa un celular chileno válido, por ejemplo +56 9 1234 5678.";
    }
    return "";
  }

  function isValid() {
    return validate() === "";
  }

  function setButtons(enabled) {
    for (var i = 0; i < payButtons.length; i++) {
      payButtons[i].disabled = !enabled;
    }
  }

  function showMsg(text, type) {
    status.hidden = false;
    status.textContent = text;
    status.className = "form-note " + type;
  }

  function sync() {
    var ok = isValid();
    setButtons(ok);
    if (ok && !status.hidden && status.className.indexOf("error") !== -1) {
      status.hidden = true;
    }
  }

  function makeFolio() {
    var d = new Date();
    var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var r = "";
    for (var i = 0; i < 4; i++) {
      r += chars[Math.floor(Math.random() * chars.length)];
    }
    return "MB-" + ymd + "-" + r;
  }

  function moneyCLP(n) {
    return "$" + Number(n).toLocaleString("es-CL");
  }

  function guardarCompra(registro) {
    return supabaseClient.from("compras").insert([registro]);
  }

  if (form) {
    form.addEventListener("input", sync);

    for (var i = 0; i < payButtons.length; i++) {
      payButtons[i].addEventListener("click", function () {
        var error = validate();
        if (error) {
          showMsg(error, "error");
          sync();
          return;
        }

        var tickets = this.getAttribute("data-ticket");
        var total = tickets === "3" ? 10000 : 5000;
        var detalle = tickets === "3" ? "3 tickets (promo)" : "1 ticket";
        var folio = makeFolio();
        var nombreV = nombre.value.trim();
        var correoV = correo.value.trim().toLowerCase();
        var telefonoV = telefono.value.trim();

        function finalizar(guardado) {
          var waMsg = "NUEVA COMPRA — Gran Sorteo ModularBox\n"
            + "Folio: " + folio + "\n"
            + "Comprador: " + nombreV + "\n"
            + "Correo: " + correoV + "\n"
            + "Teléfono: " + telefonoV + "\n"
            + "Detalle: " + detalle + " (" + moneyCLP(total) + ")";
          window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waMsg), "_blank");

          window.open(tickets === "3" ? TICKET_LINKS.tres : TICKET_LINKS.uno, "_blank");

          var msg = "¡Listo! Tu folio es " + folio + ". Termina el pago en la ventana que se abrió. "
            + "Guarda tu folio: es tu comprobante para el sorteo.";
          if (!guardado) {
            msg = "Tu folio es " + folio + ". No pudimos guardar tu registro automáticamente, "
              + "envíanoslo por WhatsApp para asegurar tu participación.";
          }
          showMsg(msg, guardado ? "success" : "error");
        }

        if (supabaseClient) {
          guardarCompra({
            folio: folio,
            nombre: nombreV,
            correo: correoV,
            telefono: telefonoV,
            tickets: detalle,
            total: total,
            fecha: new Date().toISOString()
          }).then(function (res) {
            finalizar(!res.error);
          }).catch(function () {
            finalizar(false);
          });
        } else {
          finalizar(true);
        }
      });
    }
  }
})();
