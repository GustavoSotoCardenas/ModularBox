(function () {
  "use strict";

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

  /* ---------- Formulario de cotización ----------
     COTIZACION_URL: URL del Google Apps Script (ver google-apps-script.gs).
     Déjala vacía si aún no configuras la planilla. */
  var COTIZACION_URL = "https://script.google.com/macros/s/AKfycbwNRXFRn1o721gK1URudH09oBN8UJXIqHJDf_B5CWmnFJfxHMtjZlxcsXOCpPRRWzia/exec";

  var form = document.getElementById("quoteForm");
  var status = document.getElementById("formStatus");

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nombre = form.fNombre.value.trim();
      var apellido = form.fApellido ? form.fApellido.value.trim() : "";
      var correo = form.fCorreo.value.trim();
      var telefono = form.fTelefono ? form.fTelefono.value.trim() : "";
      var necesidad = form.fTipo ? form.fTipo.value : "";
      var metros = form.fMetros ? form.fMetros.value : "";
      var mensaje = form.fMensaje ? form.fMensaje.value.trim() : "";
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

      if (!COTIZACION_URL) {
        status.className = "form-note success";
        status.textContent = "¡Gracias! Tu solicitud fue enviada, un asesor te contactará pronto.";
        form.reset();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

      fetch(COTIZACION_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          tipo_solicitud: "cotizacion",
          nombre: nombre,
          apellido: apellido,
          correo: correo,
          telefono: telefono,
          necesidad: necesidad,
          metros: metros,
          mensaje: mensaje,
          fecha: new Date().toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })
        })
      }).then(function () {
        status.className = "form-note success";
        status.textContent = "¡Gracias! Tu solicitud fue enviada, un asesor te contactará pronto.";
        form.reset();
      }).catch(function () {
        status.className = "form-note error";
        status.textContent = "Hubo un error al enviar. Intenta de nuevo o escríbenos por WhatsApp.";
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Enviar y recibir respuesta"; }
      });
    });
  }
})();
