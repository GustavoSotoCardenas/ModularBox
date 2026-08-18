  /* ---------- Formulario de cotización ----------
     El envío pasa por /api/cotizacion (función serverless de Vercel), que
     reenvía los datos al Google Apps Script (ver google-apps-script.gs) y
     devuelve si realmente se guardó o no. Configura la URL del Apps Script
     en la variable de entorno COTIZACION_GAS_URL en Vercel. */
  var COTIZACION_URL = "/api/cotizacion";

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

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

      fetch(COTIZACION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre,
          apellido: apellido,
          correo: correo,
          telefono: telefono,
          necesidad: necesidad,
          metros: metros,
          mensaje: mensaje
        })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          return { okHttp: r.ok, data: data };
        });
      }).then(function (res) {
        if (res.okHttp && res.data && res.data.ok) {
          status.className = "form-note success";
          status.textContent = "¡Gracias! Tu solicitud fue enviada, un asesor te contactará pronto.";
          form.reset();
        } else {
          status.className = "form-note error";
          status.textContent = (res.data && res.data.error) || "Hubo un error al enviar. Intenta de nuevo o escríbenos por WhatsApp.";
        }
      }).catch(function () {
        status.className = "form-note error";
        status.textContent = "Error de conexión. Revisa tu internet o escríbenos por WhatsApp.";
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Enviar y recibir respuesta"; }
      });
    });
  }