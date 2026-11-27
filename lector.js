/* Lector del QR de las pulseras a pantalla completa (panel de alumnos y Acceso Admin).
 * Es el MISMO escáner de la puerta (escaner.html): mismo encuadre y láser, alta resolución, zoom 2x, enfoque continuo,
 * linterna que alumbra mientras se mantiene pulsada, cambio de cámara, foto de respaldo, sonido y vibración.
 * Si se cambia la cámara de la puerta, hay que cambiarlo aquí también. */
(function () {
  const css = `
  .lq{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;gap:.6rem;color:#fff;background:radial-gradient(90% 40% at 50% 0%,#1b2460,transparent 70%),#070a1c;padding:max(.7rem,env(safe-area-inset-top)) .8rem max(.7rem,env(safe-area-inset-bottom))}
  .lq[hidden]{display:none}
  .lq-titulo{margin:0;text-align:center;font-weight:800;letter-spacing:.08em;font-size:1.05rem;padding:.55rem;border-radius:.9rem;border:2px solid #19d3e6;color:#19d3e6}
  .lq-visor{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;border-radius:1.3rem;overflow:hidden;background:#000;border:3px solid rgba(255,211,107,.5);box-shadow:0 0 2.5rem rgba(25,211,230,.18);transition:border-color .15s,box-shadow .15s}
  .lq-visor.ok{border-color:#2ee59d;box-shadow:0 0 3rem rgba(46,229,157,.65)}
  .lq-visor.mal{border-color:#ff5a6e;box-shadow:0 0 3rem rgba(255,90,110,.55)}
  #lqVideo{width:100%;flex:none}
  .lq-laser{position:absolute;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,#19d3e6,transparent);box-shadow:0 0 .9rem #19d3e6;animation:lq-barrido 1.8s ease-in-out infinite alternate;pointer-events:none;z-index:2}
  @keyframes lq-barrido{from{top:18%}to{top:82%}}
  .lq-estado{margin:0;min-height:2.4rem;display:grid;place-items:center;text-align:center;font-size:.9rem;color:#b9c3de}
  .lq-estado.ok{color:#7ff3c4;font-weight:800}.lq-estado.mal{color:#ff9aa6;font-weight:800}
  .lq-chips{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;max-height:5.5rem;overflow-y:auto}
  .lq-chips:empty{display:none}
  .lq-controles{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
  .lq-controles button{font:inherit;font-weight:700;font-size:.8rem;color:#fff;cursor:pointer;padding:.7rem .2rem;min-height:3.8rem;border-radius:1rem;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07)}
  .lq-controles button span{display:block;font-size:1.3rem;line-height:1.2}
  .lq-controles button.on{background:rgba(255,211,107,.22);border-color:#ffd36b;color:#ffd36b}
  .lq-controles button:disabled{opacity:.35;cursor:default}
  .lq-luz{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  .lq-foto{display:block;width:100%;font:inherit;font-weight:700;font-size:.9rem;color:#ffd36b;cursor:pointer;padding:.7rem;border-radius:1rem;border:1px dashed rgba(255,211,107,.6);background:rgba(255,211,107,.08)}
  .lq .lq-volver{margin:0;padding:.85rem}
  .lq-exito{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:1.2rem;background:rgba(4,6,18,.92)}
  .lq-exito[hidden]{display:none}
  .lq-exito div{width:min(100%,24rem);text-align:center;border:3px solid #2ee59d;border-radius:1.6rem;padding:1.8rem 1.2rem;background:#0c1230;box-shadow:0 0 4rem rgba(46,229,157,.45)}
  .lq-exito i{display:block;font-style:normal;font-size:4rem;line-height:1.2}
  .lq-exito b{display:block;font-size:1.5rem;margin:.4rem 0}
  .lq-exito p{margin:0;color:#b9c3de;line-height:1.45}
  `;
  const estilo = document.createElement("style"); estilo.textContent = css; document.head.append(estilo);
  const caja = document.createElement("div");
  caja.className = "lq"; caja.hidden = true; caja.setAttribute("role", "dialog"); caja.setAttribute("aria-modal", "true"); caja.setAttribute("aria-label", "Escáner de pulseras");
  caja.innerHTML = '<h2 class="lq-titulo"></h2>'
    + '<div class="lq-visor"><div id="lqVideo"></div><i class="lq-laser" aria-hidden="true"></i></div>'
    + '<p class="lq-estado" role="status"></p><div class="lq-chips"></div>'
    + '<div class="lq-controles"><button type="button" class="lq-cam" disabled><span>🔄</span>Cambiar cámara</button><button type="button" class="lq-luz" disabled><span>🔦</span>Linterna / Escáner</button></div>'
    + '<button type="button" class="lq-foto">📷 ¿No lo detecta? Toma una foto</button><input type="file" accept="image/*" capture="environment" hidden>'
    + '<button class="btn sec lq-volver" type="button">← Volver</button><div id="lqFoto" hidden></div>'
    + '<div class="lq-exito" role="alert" hidden><div><i>✅</i><b></b><p></p></div></div>';
  document.body.append(caja);
  const q = s => caja.querySelector(s);
  const visor = q(".lq-visor"), boton = q(".lq-volver"), chips = q(".lq-chips"), archivo = q("input[type=file]"), luz = q(".lq-luz"), cambiar = q(".lq-cam"), exitoCaja = q(".lq-exito");

  /* El QR de la pulsera trae una dirección (…/#TOKEN). También se acepta el token solo. */
  const extraer = txt => { txt = String(txt || "").trim(); const i = txt.lastIndexOf("#"); return (i >= 0 ? txt.slice(i + 1) : txt).trim(); };
  const guardada = v => { try { if (v === undefined) return localStorage.getItem("camara_g30") || ""; localStorage.setItem("camara_g30", v); } catch (_) {} return ""; };   // la misma que elige la puerta
  let lector = null, alLeer = null, alCerrar = null, ultimo = "", en = 0, antes = "", camId = guardada(), turno = 0, leyo = false, eligiendo = false, relojVerde = null, audio = null;
  let colaLuz = Promise.resolve(), luzPedida = false;
  const nuevo = id => new Html5Qrcode(id, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], experimentalFeatures: { useBarCodeDetectorIfSupported: true } });

  /* sonido y vibración (el audio se activa al abrir el escáner, que es un toque del usuario: así suena también en iPhone) */
  function prepararSonido() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (_) {}
  }
  function pitar(ok) {
    try {
      if (audio) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.connect(g); g.connect(audio.destination); o.type = "sine"; o.frequency.value = ok ? 880 : 220; g.gain.value = .15;
        o.start(); o.stop(audio.currentTime + (ok ? .15 : .45));
      }
    } catch (_) {}
    try { navigator.vibrate && navigator.vibrate(ok ? 80 : [200, 80, 200]); } catch (_) {}
  }
  function marco(tipo, dura) {
    clearTimeout(relojVerde); visor.className = "lq-visor" + (tipo ? " " + tipo : "");
    if (tipo && dura) relojVerde = setTimeout(() => visor.className = "lq-visor", dura);
  }
  function estado(t, tipo) {
    const e = q(".lq-estado"); e.textContent = t || ""; e.className = "lq-estado" + (tipo ? " " + tipo : "");
    if (tipo === "mal") { marco("mal", 2500); if (leyo) { leyo = false; pitar(false); } }
    else if (tipo === "ok") marco("ok", 2500);
  }
  /* una pulsera leída: marca verde, suena y avisa a quien pidió el escáner */
  function recibir(txt) {
    const t = extraer(txt);
    if (!t || !alLeer) return;
    leyo = true; marco("ok", 1500); pitar(true);
    return alLeer(t);
  }
  function camara(txt) {
    const t = extraer(txt), ahora = Date.now();
    if (!t || (t === ultimo && ahora - en < 4000)) { en = ahora; return; }   // la misma pulsera no se lee dos veces seguidas
    ultimo = t; en = ahora;
    recibir(t);
  }

  /* La luz solo dura mientras se mantiene pulsado el botón (igual que en la puerta). */
  function ponerLuz(on) {
    luzPedida = on; luz.classList.toggle("on", on);
    colaLuz = colaLuz.then(async () => {
      if (!lector) return;
      try { await lector.applyVideoConstraints({ advanced: [{ torch: luzPedida }] }); }
      catch (_) { estado("No se pudo usar la linterna en esta cámara."); }
    });
  }
  luz.addEventListener("pointerdown", e => { if (luz.disabled) return; e.preventDefault(); try { luz.setPointerCapture(e.pointerId); } catch (_) {} ponerLuz(true); });
  ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach(ev => luz.addEventListener(ev, () => { if (luzPedida) ponerLuz(false); }));
  luz.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); ponerLuz(true); } });
  luz.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") ponerLuz(false); });
  luz.addEventListener("contextmenu", e => e.preventDefault());

  const camaras = async () => { try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput"); } catch (_) { return []; } };
  const idActual = () => { try { return lector.getRunningTrackSettings().deviceId || ""; } catch (_) { return ""; } };

  async function soltar() {
    turno++;
    const l = lector; lector = null; luzPedida = false; luz.classList.remove("on"); luz.disabled = true; cambiar.disabled = true;
    if (l) { try { await l.stop(); l.clear(); } catch (_) {} }
  }
  async function encender() {
    const mio = ++turno;
    estado("Encendiendo cámara…");
    const cfg = (id, alta) => {
      const c = { fps: 12, qrbox: (w, h) => { const l = Math.floor(Math.min(w, h) * .92); return { width: l, height: l }; } };
      if (alta) c.videoConstraints = Object.assign(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }, { width: { ideal: 1920 }, height: { ideal: 1080 } });
      return c;
    };
    // si el teléfono no acepta la resolución alta o la cámara guardada ya no existe, se prueba algo más simple
    const intentos = (camId ? [[camId, true], [camId, false]] : []).concat([["", true], ["", false]]);
    let l = null;
    for (const [id, alta] of intentos) {
      try { l = nuevo("lqVideo"); await l.start(id || { facingMode: "environment" }, cfg(id, alta), camara, () => {}); if (!id) camId = ""; break; }
      catch (_) { try { l && l.clear(); } catch (_) {} l = null; }
      if (mio !== turno) return;
    }
    if (mio !== turno || caja.hidden) { if (l) { try { await l.stop(); l.clear(); } catch (_) {} } return; }
    if (!l) return estado("No se pudo abrir la cámara. Da permiso de cámara al navegador, o toma una foto.", "mal");
    lector = l;
    const lista = await camaras();
    if (lector !== l) return;
    cambiar.disabled = lista.length < 2;
    const n = lista.findIndex(c => c.deviceId === idActual());
    let aviso = "Apunta al QR de la pulsera" + (lista.length > 1 && n >= 0 ? ` · cámara ${n + 1} de ${lista.length}` : "");
    try {   // acercar (zoom 2x) y enfoque continuo: se lee a unos 15-20 cm, donde la cámara sí enfoca
      const cap = l.getRunningTrackCapabilities(), adv = {};
      if (cap.zoom && cap.zoom.max > 1) adv.zoom = Math.min(cap.zoom.max, 2);
      if (Array.isArray(cap.focusMode) && cap.focusMode.indexOf("continuous") >= 0) adv.focusMode = "continuous";
      if (Object.keys(adv).length) await l.applyVideoConstraints({ advanced: [adv] });
      if (adv.zoom) aviso += " · zoom " + adv.zoom + "x: aleja el código unos 20 cm";
    } catch (_) {}
    let conLuz = false; try { conLuz = !!l.getRunningTrackCapabilities().torch; } catch (_) {}
    if (lector !== l) return;
    luz.disabled = !conLuz;
    aviso += conLuz ? " · mantén pulsada la linterna para alumbrar" : " · esta cámara no permite usar la linterna desde la web";
    estado(aviso);
  }
  cambiar.onclick = async () => {
    const lista = await camaras(); if (lista.length < 2 || !lector) return;
    const n = lista.findIndex(c => c.deviceId === idActual());
    camId = lista[(n + 1) % lista.length].deviceId; guardada(camId);
    await soltar(); await encender();
  };

  /* Respaldo: foto con la cámara normal del teléfono (enfoca mejor) y se lee el QR de la imagen */
  q(".lq-foto").onclick = () => { eligiendo = true; soltar(); archivo.value = ""; archivo.click(); };
  const reanudar = () => { eligiendo = false; if (!caja.hidden && !lector) encender(); };
  archivo.addEventListener("cancel", reanudar);
  archivo.onchange = async () => {
    const f = archivo.files[0];
    if (!f) return reanudar();
    estado("Leyendo la foto…");
    let txt = "";
    try {
      const img = await createImageBitmap(f), k = Math.min(1, 2200 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const chica = new File([await new Promise(r => c.toBlob(r, "image/jpeg", .92))], "pulsera.jpg", { type: "image/jpeg" });
      txt = await nuevo("lqFoto").scanFile(chica, false);
    } catch (_) {}
    await (async () => { eligiendo = false; if (!caja.hidden && !lector) await encender(); })();
    if (!txt) return estado("No encontramos el QR en la foto. Acércate y que se vea nítido.", "mal");
    ultimo = ""; recibir(txt);
  };
  document.addEventListener("visibilitychange", () => {
    if (caja.hidden) return;
    if (document.hidden) soltar();
    else if (eligiendo) setTimeout(() => { if (eligiendo) reanudar(); }, 4000);
    else if (!lector) encender();
  });

  async function abrir(titulo, fn, op) {
    op = op || {};
    prepararSonido();
    alLeer = fn; alCerrar = op.alCerrar || null; ultimo = ""; leyo = false; eligiendo = false;
    q(".lq-titulo").textContent = titulo; chips.textContent = ""; boton.textContent = op.boton || "← Volver"; exitoCaja.hidden = true; marco("");
    if (caja.hidden) antes = document.body.style.overflow;
    caja.hidden = false; document.body.style.overflow = "hidden";
    if (typeof Html5Qrcode === "undefined") return estado("No se pudo cargar el escáner. Revisa la conexión.", "mal");
    await soltar(); await encender();
  }
  async function cerrar() {
    if (caja.hidden) return;
    caja.hidden = true; document.body.style.overflow = antes;
    const fin = alCerrar; alLeer = null; alCerrar = null;
    await soltar();
    fin && fin();
  }
  /* Pantalla verde de confirmación; se resuelve tras un momento para pasar a lo siguiente. */
  function exito(titulo, detalle) {
    alLeer = null; soltar();
    exitoCaja.querySelector("b").textContent = titulo; exitoCaja.querySelector("p").textContent = detalle || ""; exitoCaja.hidden = false;
    return new Promise(listo => setTimeout(listo, 1800));
  }
  boton.onclick = cerrar;

  window.LectorQR = { abrir, cerrar, estado, recibir, exito, chips, boton: t => boton.textContent = t };
})();
