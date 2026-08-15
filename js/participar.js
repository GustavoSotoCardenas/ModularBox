(function () {
  "use strict";

  /* Número donde llega el aviso de cada participación por WhatsApp. */
  var WHATSAPP_NUMBER = "56988840060";

  var form = document.getElementById("participaForm");
  var status = document.getElementById("payStatus");
  var nombre = document.getElementById("pNombre");
  var correo = document.getElementById("pCorreo");
  var correoConfirm = document.getElementById("pCorreoConfirm");
  var telefono = document.getElementById("pTelefono");
  var payButtons = document.querySelectorAll(".pay-btn");
  var resultadoBox = document.getElementById("pagoResultado");
  var resultadoFolios = document.getElementById("resultadoFolios");
  var resultadoWa = document.getElementById("resultadoWa");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NAME_RE = /^[\p{L}\s.'-]{2,60}$/u;
  var PHONE_RE = /^(\+?56|0)?9\d{8}$/;

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

  function moneyCLP(n) {
    return "$" + Number(n).toLocaleString("es-CL");
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function waUrl(orden) {
    var waMsg = "NUEVA COMPRA CONFIRMADA — Gran Sorteo ModularBox\n"
      + "Folio(s): " + (orden.folios || []).join(", ") + "\n"
      + "Comprador: " + orden.nombre + "\n"
      + "Correo: " + orden.correo + "\n"
      + "Teléfono: " + orden.telefono + "\n"
      + "Detalle: " + orden.tickets + " (" + moneyCLP(orden.total) + ")";
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waMsg);
  }

  function mostrarConfirmado(orden) {
    if (form) { form.hidden = true; }
    if (resultadoFolios) {
      resultadoFolios.innerHTML = "";
      var items = [];
      if (orden.numeros && orden.numeros.length) {
        items = orden.numeros.map(function (t) { return "N° " + t.numero + " · " + t.folio; });
      } else {
        items = (orden.folios || []).slice();
      }
      for (var i = 0; i < items.length; i++) {
        var li = document.createElement("li");
        li.textContent = items[i];
        resultadoFolios.appendChild(li);
      }
    }
    if (resultadoWa) { resultadoWa.href = waUrl(orden); }
    if (resultadoBox) {
      resultadoBox.hidden = false;
      resultadoBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* Espera la confirmación del pago y muestra los folios cuando llega. */
  function esperarConfirmacion(orden) {
    showMsg("Esperando la confirmación de tu pago...", "success");
    setButtons(false);
    var intentos = 0;
    var timer = setInterval(function () {
      intentos++;
      fetch("/api/verificar?orden=" + encodeURIComponent(orden))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.estado === "pagado") {
            clearInterval(timer);
            mostrarConfirmado(data);
          } else if (data.estado === "rechazado") {
            clearInterval(timer);
            showMsg("Tu pago fue rechazado. Intenta de nuevo con otro medio de pago.", "error");
            setButtons(true);
          } else if (intentos >= 45) {
            clearInterval(timer);
            showMsg("Todavía no confirmamos tu pago. Tu folio quedará registrado en cuanto llegue la confirmación.", "success");
            setButtons(true);
          }
        })
        .catch(function () {});
    }, 2000);
  }

  function iniciarPago(tickets) {
    var datos = {
      nombre: nombre.value.trim(),
      correo: correo.value.trim().toLowerCase(),
      telefono: telefono.value.trim(),
      tickets: tickets
    };
    setButtons(false);
    showMsg("Preparando tu pago seguro...", "success");

    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    }).then(function (r) {
      return r.json();
    }).then(function (data) {
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        showMsg(data.error || "No se pudo iniciar el pago. Intenta de nuevo.", "error");
        setButtons(true);
      }
    }).catch(function () {
      showMsg("Error de conexión. Revisa tu internet e intenta de nuevo.", "error");
      setButtons(true);
    });
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
        iniciarPago(this.getAttribute("data-ticket"));
      });
    }
  }

  /* Si venimos de MercadoPago (pago aprobado/pendiente), esperamos la confirmación. */
  var resultado = getParam("resultado");
  var orden = getParam("orden");
  if (orden) {
    if (resultado === "fallo") {
      showMsg("Tu pago no se completó. Vuelve a intentarlo.", "error");
    } else {
      esperarConfirmacion(orden);
    }
  }
})();
