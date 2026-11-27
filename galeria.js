/* Galería de fotos de la fiesta: la usan el panel de alumnos, el portal de apoderados y Acceso Admin.
 * Las fotos son privadas: no tienen dirección pública; llegan desde el servidor solo a quien puede verlas. */
(function () {
  const css = `
  .gx-rejilla{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem}
  .gx-celda{position:relative;aspect-ratio:1;border:0;padding:0;border-radius:.7rem;overflow:hidden;cursor:pointer;background:linear-gradient(110deg,rgba(255,255,255,.06) 40%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 60%);background-size:200% 100%;animation:gx-brillo 1.4s linear infinite}
  .gx-celda.lista{animation:none}
  .gx-celda img{width:100%;height:100%;object-fit:cover;display:block}
  .gx-celda i{position:absolute;left:.25rem;bottom:.25rem;font-style:normal;font-size:.62rem;font-weight:800;border-radius:99px;padding:.12rem .45rem;background:rgba(7,10,28,.82);color:#fff;max-width:calc(100% - .5rem);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gx-celda i.alerta{background:#b3263a}
  @keyframes gx-brillo{to{background-position:-200% 0}}
  .gx-dia{font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#b9c3de;margin:1rem .1rem .45rem}
  .gx-dia:first-child{margin-top:0}
  .gx-vacio{text-align:center;color:#b9c3de;font-size:.9rem;line-height:1.55;padding:2.2rem 1rem}
  .gx-vacio span{display:block;font-size:3.2rem;margin-bottom:.5rem}
  .gx-visor{position:fixed;inset:0;z-index:40;background:rgba(3,4,14,.97);display:flex;flex-direction:column;color:#fff;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
  .gx-cab{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.7rem 1rem}
  .gx-cab b{display:block;font-size:.95rem}
  .gx-cab small{color:#b9c3de;font-size:.76rem}
  .gx-x{flex:none;width:2.6rem;height:2.6rem;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:1.1rem;cursor:pointer}
  .gx-img{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}
  .gx-img img{max-width:100%;max-height:100%;object-fit:contain}
  .gx-img img.previa{filter:blur(6px);width:100%;height:100%}
  .gx-gira{position:absolute;width:2.6rem;height:2.6rem;border-radius:50%;border:4px solid rgba(255,255,255,.2);border-top-color:#ffd36b;animation:gx-giro .9s linear infinite}
  @keyframes gx-giro{to{transform:rotate(360deg)}}
  .gx-pie{padding:.7rem 1rem 1rem;max-height:42%;overflow-y:auto}
  .gx-pie p{margin:0 0 .5rem;line-height:1.45;overflow-wrap:anywhere}
  .gx-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.7rem}
  .gx-chips span{font-size:.76rem;font-weight:700;border-radius:99px;padding:.22rem .65rem;background:rgba(25,211,230,.18);color:#a8f3fb}
  .gx-acciones{display:flex;flex-wrap:wrap;gap:.5rem}
  .gx-acciones button{flex:1 1 9rem;font:inherit;font-weight:800;font-size:.9rem;border-radius:99px;padding:.8rem;cursor:pointer;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25)}
  .gx-acciones button.oro{background:linear-gradient(110deg,#f5a623,#ffd36b);color:#1a1204;border-color:transparent}
  .gx-acciones button.mal{background:rgba(255,90,110,.16);border-color:rgba(255,90,110,.6);color:#ffb3bc}
  .gx-acciones button:disabled{opacity:.55;cursor:wait}
  `;
  const estilo = document.createElement("style"); estilo.textContent = css; document.head.append(estilo);

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cuando = ms => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
  const diaDe = ms => new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(ms));
  const minis = new Map();   // id → imagen chica ya descargada (dura mientras la página esté abierta)
  let tanda = 0;

  /* fotos: [{id, ms, ...}]. op: { traer(ids) → {id: dataURL}, abrir(foto), etiqueta(foto) → texto|"" , vacio: html } */
  function rejilla(caja, fotos, op) {
    const mia = ++tanda;
    caja.dataset.tanda = mia;
    caja.textContent = "";
    if (!fotos.length) { caja.innerHTML = `<div class="gx-vacio">${op.vacio || "<span>🖼️</span>Todavía no hay fotos."}</div>`; return; }
    let dia = "", grilla = null;
    const celdas = new Map();
    fotos.forEach(f => {
      const d = diaDe(f.ms);
      if (d !== dia) {
        dia = d;
        const t = document.createElement("p"); t.className = "gx-dia"; t.textContent = d;
        grilla = document.createElement("div"); grilla.className = "gx-rejilla";
        caja.append(t, grilla);
      }
      const b = document.createElement("button"); b.type = "button"; b.className = "gx-celda";
      b.setAttribute("aria-label", "Foto de " + (f.autor || "") + ", " + cuando(f.ms));
      const marca = op.etiqueta ? op.etiqueta(f) : "";
      if (marca) { const i = document.createElement("i"); i.textContent = marca; if (marca.startsWith("⚠")) i.className = "alerta"; b.append(i); }
      b.onclick = () => op.abrir(f);
      grilla.append(b); celdas.set(f.id, b);
      if (minis.has(f.id)) poner(b, minis.get(f.id));
    });
    cargar(caja, mia, fotos.filter(f => !minis.has(f.id)).map(f => f.id), celdas, op);
  }
  function poner(celda, src) {
    if (celda.querySelector("img")) return;
    const img = document.createElement("img"); img.src = src; img.alt = "";
    celda.prepend(img); celda.classList.add("lista");
  }
  async function cargar(caja, mia, ids, celdas, op) {
    for (let i = 0; i < ids.length; i += 9) {
      if (caja.dataset.tanda != mia) return;
      let r = {};
      try { r = await op.traer(ids.slice(i, i + 9)) || {}; } catch (_) { return; }
      ids.slice(i, i + 9).forEach(id => {
        const c = celdas.get(id);
        if (r[id]) { minis.set(id, r[id]); if (c) poner(c, r[id]); } else if (c) c.classList.add("lista");
      });
    }
  }

  /* op: { cargar() → dataURL, acciones: [{ texto, clase, hacer(cerrar, imagen, boton) }] } */
  function visor(f, op) {
    const v = document.createElement("div"); v.className = "gx-visor"; v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true");
    v.innerHTML = `<div class="gx-cab"><div><b>${esc(f.autor || "")}</b><small>${esc(cuando(f.ms))}${f.curso ? " · " + esc(f.curso) : ""}</small></div><button type="button" class="gx-x" aria-label="Cerrar">✕</button></div>
      <div class="gx-img">${minis.has(f.id) ? `<img class="previa" src="${minis.get(f.id)}" alt="">` : ""}<div class="gx-gira"></div></div>
      <div class="gx-pie">${f.msg ? `<p>${esc(f.msg)}</p>` : ""}${f.personas && f.personas.length ? `<div class="gx-chips">${f.personas.map(n => `<span>🏷️ ${esc(n)}</span>`).join("")}</div>` : ""}<div class="gx-acciones"></div></div>`;
    let imagen = "";
    const antes = document.body.style.overflow; document.body.style.overflow = "hidden";
    const cerrar = () => { v.remove(); document.body.style.overflow = antes; };
    v.querySelector(".gx-x").onclick = cerrar;
    const acciones = v.querySelector(".gx-acciones");
    (op.acciones || []).forEach(a => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = a.texto; b.className = a.clase || ""; if (a.espera) b.disabled = true;
      b.onclick = () => a.hacer(cerrar, imagen, b);
      if (a.espera) b.dataset.espera = "1";
      acciones.append(b);
    });
    document.body.append(v);
    Promise.resolve(op.cargar()).then(src => {
      const caja = v.querySelector(".gx-img");
      if (!src) { caja.innerHTML = '<div class="gx-vacio"><span>📡</span>No se pudo abrir la foto. Inténtalo de nuevo.</div>'; return; }
      imagen = src; caja.innerHTML = ""; const img = document.createElement("img"); img.src = src; img.alt = f.msg || "Foto"; caja.append(img);
      v.querySelectorAll("[data-espera]").forEach(b => b.disabled = false);
    }).catch(() => { v.querySelector(".gx-img").innerHTML = '<div class="gx-vacio"><span>📡</span>Sin conexión.</div>'; });
    return cerrar;
  }

  const aArchivo = (dataUrl, nombre) => {
    const bin = atob(dataUrl.split(",")[1]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new File([u], nombre, { type: "image/jpeg" });
  };
  /* Una página no puede guardar sola en la galería: se abre "compartir" (ahí está "Guardar imagen") o se descarga. */
  async function guardar(foto, nombre) {
    const archivo = typeof foto === "string" ? aArchivo(foto, nombre) : foto;
    try {
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo] }); return; }
    } catch (e) { if (e.name === "AbortError") return; }
    const url = URL.createObjectURL(archivo), a = document.createElement("a");
    a.href = url; a.download = archivo.name || nombre; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const nombreArchivo = ms => { const d = new Date(ms), p = n => String(n).padStart(2, "0"); return `PromG30-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`; };

  window.GaleriaG30 = { rejilla, visor, guardar, nombreArchivo, cuando, olvidar: id => minis.delete(id), vaciar: () => minis.clear() };
})();
