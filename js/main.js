(function () {
  "use strict";

  /* ---------- Registro de compras ----------
     WHATSAPP_NUMBER: número donde te llega el aviso de cada compra.
     SHEET_URL: URL del Google Apps Script (te la dejo en google-apps-script.gs).
     Déjala vacía si aún no configuras la planilla: la venta igual te llega por WhatsApp. */
  var WHATSAPP_NUMBER = "56988840060";
  var SHEET_URL = "";

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    siteNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        siteNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Header: sombra al hacer scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) {
      header.style.boxShadow = window.scrollY > 10
        ? "0 4px 20px rgba(0,0,0,.25)"
        : "none";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Popup de promoción ---------- */
  var promoModal = document.getElementById("promoModal");
  var promoClose = document.getElementById("promoClose");

  function openPromo() {
    if (!promoModal) return;
    promoModal.hidden = false;
    promoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closePromo() {
    if (!promoModal) return;
    promoModal.hidden = true;
    promoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  if (promoModal) {
    if (promoClose) {
      promoClose.addEventListener("click", closePromo);
    }
    promoModal.addEventListener("click", function (e) {
      if (e.target.closest("[data-promo-close]")) {
        closePromo();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePromo();
    });

    setTimeout(openPromo, 700);
  }

  var promoOpenLinks = document.querySelectorAll(".promo-open");
  for (var i = 0; i < promoOpenLinks.length; i++) {
    promoOpenLinks[i].addEventListener("click", function (e) {
      e.preventDefault();
      openPromo();
    });
  }

  /* ---------- Registro de compra y boleta ---------- */
  var buyForm = document.getElementById("buyForm");
  var buyStatus = document.getElementById("buyStatus");
  var boletaOverlay = document.getElementById("boletaOverlay");

  function pad(n) { return String(n).padStart(2, "0"); }

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

  if (buyForm && buyStatus && boletaOverlay) {
    buyForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var nombre = buyForm.bNombre.value.trim();
      var correo = buyForm.bCorreo.value.trim();
      var telefono = buyForm.bTelefono.value.trim();
      var tickets = buyForm.bTickets.value;
      var referencia = buyForm.bReferencia.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

      buyStatus.hidden = false;
      if (!nombre) {
        buyStatus.textContent = "Ingresa tu nombre.";
        buyStatus.className = "form-note error";
        buyForm.bNombre.focus();
        return;
      }
      if (!emailOk) {
        buyStatus.textContent = "Ingresa un correo válido.";
        buyStatus.className = "form-note error";
        buyForm.bCorreo.focus();
        return;
      }
      if (!telefono) {
        buyStatus.textContent = "Ingresa tu teléfono.";
        buyStatus.className = "form-note error";
        buyForm.bTelefono.focus();
        return;
      }
      if (tickets !== "1" && tickets !== "3") {
        buyStatus.textContent = "Selecciona la cantidad de tickets.";
        buyStatus.className = "form-note error";
        return;
      }
      if (!referencia) {
        buyStatus.textContent = "Ingresa el ID o referencia de tu pago.";
        buyStatus.className = "form-note error";
        buyForm.bReferencia.focus();
        return;
      }

      var total = tickets === "3" ? 10000 : 5000;
      var folio = makeFolio();
      var detalle = tickets === "3" ? "3 tickets (promo)" : "1 ticket";
      var fecha = new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });

      /* Llenar la boleta */
      document.getElementById("bFolio").textContent = folio;
      document.getElementById("bFecha").textContent = fecha;
      document.getElementById("bNombre").textContent = nombre;
      document.getElementById("bCorreo").textContent = correo;
      document.getElementById("bTelefono").textContent = telefono;
      document.getElementById("bDetalle").textContent = detalle;
      document.getElementById("bTotal").textContent = moneyCLP(total);
      document.getElementById("bReferencia").textContent = referencia;

      boletaOverlay.hidden = false;

      /* Registrar en Google Sheets */
      if (SHEET_URL) {
        var payload = {
          folio: folio,
          nombre: nombre,
          correo: correo,
          telefono: telefono,
          tickets: detalle,
          total: total,
          referencia: referencia,
          fecha: fecha
        };
        fetch(SHEET_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        }).catch(function () {});
      }

      /* Aviso por WhatsApp al dueño */
      var waMsg = "NUEVA COMPRA — Gran Sorteo ModularBox\n"
        + "Folio: " + folio + "\n"
        + "Comprador: " + nombre + "\n"
        + "Correo: " + correo + "\n"
        + "Teléfono: " + telefono + "\n"
        + "Detalle: " + detalle + " (" + moneyCLP(total) + ")\n"
        + "Ref. de pago: " + referencia;
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waMsg), "_blank");

      /* Cerrar el formulario y limpiar */
      var registro = document.getElementById("buyRegistro");
      if (registro) { registro.removeAttribute("open"); }
      buyForm.reset();
      buyStatus.hidden = true;
    });
  }

  /* Imprimir y cerrar la boleta */
  var printBoleta = document.getElementById("printBoleta");
  if (printBoleta) {
    printBoleta.addEventListener("click", function () {
      window.print();
    });
  }
  var closeBoleta = document.getElementById("closeBoleta");
  if (closeBoleta) {
    closeBoleta.addEventListener("click", function () {
      boletaOverlay.hidden = true;
    });
  }

  /* ---------- Formulario de cotización ---------- */
  var form = document.getElementById("quoteForm");
  var status = document.getElementById("formStatus");

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nombre = form.fNombre.value.trim();
      var correo = form.fCorreo.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

      status.hidden = false;
      if (!nombre) {
        status.textContent = "Por favor ingresa tu nombre.";
        status.className = "form-note error";
        form.fNombre.focus();
        return;
      }
      if (!emailOk) {
        status.textContent = "Por favor ingresa un correo válido.";
        status.className = "form-note error";
        form.fCorreo.focus();
        return;
      }

      status.className = "form-note success";
      status.textContent = "¡Gracias! Tu solicitud fue enviada, un asesor te contactará pronto.";
      form.reset();
    });
  }
})();
