/* Lector del QR de las pulseras a pantalla completa (panel de alumnos y Acceso Admin). Usa html5-qrcode. */
(function () {
  const css = `
  .lq{position:fixed;inset:0;z-index:50;background:#04060f;color:#fff;display:flex;flex-direction:column;padding:max(.8rem,env(safe-area-inset-top)) 1rem max(1rem,env(safe-area-inset-bottom))}
  .lq[hidden]{display:none}
  .lq h2{font-size:1.15rem;text-align:center;margin:0 0 .6rem}
  .lq .lq-video{flex:1;min-height:0;width:100%;border-radius:1.2rem;overflow:hidden;background:#000}
  .lq .lq-video video{width:100%!important;height:100%!important;object-fit:cover}
  .lq .lq-estado{min-height:3.2rem;display:grid;place-items:center;text-align:center;font-weight:800;padding:.5rem 0;margin:0}
  .lq .lq-estado.ok{color:#7ff3c4}.lq .lq-estado.mal{color:#ff9aa6}
  .lq .lq-chips{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;max-height:6.5rem;overflow-y:auto;margin:0 0 .7rem}
  .lq label{display:block;text-align:center;margin-top:.7rem;color:#19d3e6;font-weight:700;font-size:.88rem;text-decoration:underline;cursor:pointer}
  .lq label input{position:absolute;width:1px;height:1px;opacity:0}
  `;
  const estilo = document.createElement("style"); estilo.textContent = css; document.head.append(estilo);
  const caja = document.createElement("div");
  caja.className = "lq"; caja.hidden = true; caja.setAttribute("role", "dialog"); caja.setAttribute("aria-modal", "true"); caja.setAttribute("aria-label", "Escáner de pulseras");
  caja.innerHTML = '<h2></h2><div class="lq-video" id="lqVideo"></div><p class="lq-estado" role="status"></p><div class="lq-chips"></div>'
    + '<button class="btn" type="button">Listo</button><label>¿No lee? Saca una foto del QR<input type="file" accept="image/*" capture="environment"></label><div id="lqFoto" hidden></div>';
  document.body.append(caja);
  const q = s => caja.querySelector(s), boton = q("button.btn"), chips = q(".lq-chips"), archivo = q("input[type=file]");

  /* El QR de la pulsera trae una dirección (…/#TOKEN). También se acepta el token solo. */
  const extraer = txt => { txt = String(txt || "").trim(); const i = txt.lastIndexOf("#"); return (i >= 0 ? txt.slice(i + 1) : txt).trim(); };
  let lector = null, alLeer = null, alCerrar = null, ultimo = "", en = 0, antes = "";
  const nuevo = id => new Html5Qrcode(id, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
  function estado(t, tipo) { const e = q(".lq-estado"); e.textContent = t || ""; e.className = "lq-estado" + (tipo ? " " + tipo : ""); }
  function recibir(txt) { const t = extraer(txt); if (t && alLeer) return alLeer(t); }
  function camara(txt) {
    const t = extraer(txt), ahora = Date.now();
    if (!t || (t === ultimo && ahora - en < 4000)) { en = ahora; return; }   // la misma pulsera no se lee dos veces seguidas
    ultimo = t; en = ahora;
    if (navigator.vibrate) navigator.vibrate(40);
    recibir(t);
  }
  async function abrir(titulo, fn, op) {
    op = op || {};
    alLeer = fn; alCerrar = op.alCerrar || null; ultimo = "";
    q("h2").textContent = titulo; chips.textContent = ""; boton.textContent = op.boton || "Listo";
    if (caja.hidden) antes = document.body.style.overflow;
    caja.hidden = false; document.body.style.overflow = "hidden";
    estado("Encendiendo la cámara…");
    if (typeof Html5Qrcode === "undefined") return estado("No se pudo cargar el escáner. Revisa la conexión.", "mal");
    const cfg = { fps: 12, qrbox: (w, h) => { const l = Math.floor(Math.min(w, h) * .85); return { width: l, height: l }; } };
    try {
      const l = nuevo("lqVideo");
      lector = l;
      await l.start({ facingMode: "environment" }, cfg, camara, () => {});
      if (lector !== l || caja.hidden) { try { await l.stop(); l.clear(); } catch (_) {} return; }
      estado("Busca el código QR de la pulsera");
    } catch (_) { lector = null; estado("No se pudo abrir la cámara. Da permiso, o usa la foto del QR.", "mal"); }
  }
  async function cerrar() {
    if (caja.hidden) return;
    caja.hidden = true; document.body.style.overflow = antes;
    const l = lector, fin = alCerrar; lector = null; alLeer = null; alCerrar = null;
    if (l) { try { await l.stop(); l.clear(); } catch (_) {} }
    fin && fin();
  }
  boton.onclick = cerrar;
  archivo.onchange = async () => {
    const f = archivo.files[0]; archivo.value = "";
    if (!f) return;
    estado("Leyendo la foto…");
    try { const txt = await nuevo("lqFoto").scanFile(f, false); ultimo = ""; recibir(txt); }
    catch (_) { estado("No encontramos el QR en la foto. Acércate y que se vea nítido.", "mal"); }
  };

  window.LectorQR = { abrir, cerrar, estado, recibir, chips, boton: t => boton.textContent = t };
})();
