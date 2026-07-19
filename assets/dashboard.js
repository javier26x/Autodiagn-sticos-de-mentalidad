/* =============================================================================
 * Panel del docente · asistente por pasos
 *   1) Acceso (contraseña)
 *   2) Colegio + fecha  ->  crea la evaluación
 *   3) QR del colegio    ->  para proyectar
 *   4) Resultados en vivo (solo de esa evaluación)
 * Pensado para la pantalla del PC del docente.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.QUIZ_CONFIG || {};
  var Q = window.QUIZ;
  var LOCAL_RESULTS_KEY = 'jump-mindset-local-results-v1';
  var EVAL_KEY = 'jump-eval-v1';
  var AUTH_KEY = 'jump-facilitator-ok';

  var stepRoot = document.getElementById('stepRoot');
  var stepperEl = document.getElementById('stepper');
  var topMeta = document.getElementById('topMeta');

  // --- Utilidades ----------------------------------------------------------
  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function todayISO() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // --- Estado --------------------------------------------------------------
  var authed = (function () { try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; } })();
  var evaluation = (function () {
    try { return JSON.parse(localStorage.getItem(EVAL_KEY) || 'null'); } catch (e) { return null; }
  })();
  function saveEval() { try { localStorage.setItem(EVAL_KEY, JSON.stringify(evaluation)); } catch (e) {} }

  function hasPassword() { return !!(CFG.facilitatorPassword); }
  function needsLogin() { return hasPassword() && !authed; }

  // Pasos disponibles (login solo si hay contraseña).
  function steps() {
    var s = [];
    if (hasPassword()) s.push({ id: 'login', label: 'Acceso' });
    s.push({ id: 'colegio', label: 'Colegio' });
    s.push({ id: 'qr', label: 'QR' });
    s.push({ id: 'resultados', label: 'Resultados' });
    return s;
  }

  var current = 'login';

  function canGo(id) {
    if (id === 'login') return true;
    if (needsLogin()) return false;
    if (id === 'colegio') return true;
    return !!evaluation; // qr y resultados requieren evaluación
  }
  function go(id) {
    if (!canGo(id)) return;
    current = id;
    renderTopMeta();
    renderStepper();
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- URL del cuestionario para la evaluación ------------------------------
  function quizUrl() {
    var u = new URL('encuesta.html', window.location.href);
    if (evaluation && evaluation.colegio) u.searchParams.set('colegio', evaluation.colegio);
    if (evaluation && evaluation.fecha) u.searchParams.set('fecha', evaluation.fecha);
    return u.href;
  }

  // --- Barra superior (salir) ----------------------------------------------
  function renderTopMeta() {
    topMeta.innerHTML = '';
    if (hasPassword() && authed && current !== 'login') {
      var b = h('<button class="linkbtn" style="color:#fff;opacity:.85">🔒 Salir</button>');
      b.addEventListener('click', function () {
        try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
        authed = false; go('login');
      });
      topMeta.appendChild(b);
    }
  }

  // --- Stepper -------------------------------------------------------------
  function renderStepper() {
    var list = steps();
    var curIdx = list.findIndex(function (s) { return s.id === current; });
    stepperEl.innerHTML = list.map(function (s, i) {
      var cls = 'st';
      if (s.id === current) cls += ' active';
      else if (i < curIdx) cls += ' done';
      if (canGo(s.id) && s.id !== current) cls += ' clickable';
      return '<div class="' + cls + '" data-step="' + s.id + '">' +
        '<span class="num">' + (i + 1) + '</span><span class="lbl">' + s.label + '</span></div>';
    }).join('');
    stepperEl.querySelectorAll('.st.clickable').forEach(function (el) {
      el.addEventListener('click', function () { go(el.getAttribute('data-step')); });
    });
  }

  // =========================================================================
  // PASO 1 · Acceso
  // =========================================================================
  function renderLogin() {
    var node = h([
      '<div class="view" style="max-width:460px;margin:0 auto">',
      '  <div class="card">',
      '    <div class="big-emoji center">🔒</div>',
      '    <div class="eyebrow center" style="margin-top:6px">Paso 1 · Acceso del docente</div>',
      '    <h1 class="center" style="margin:6px 0 2px;font-size:1.6rem">Inicia sesión</h1>',
      '    <p class="center" style="margin:0 0 6px">Escribe tu contraseña para preparar la evaluación.</p>',
      '    <div class="field">',
      '      <label for="pw">Contraseña</label>',
      '      <input id="pw" type="password" autocomplete="current-password" placeholder="••••••••" />',
      '    </div>',
      '    <p class="err" id="pwErr"></p>',
      '    <button class="btn btn--primary" id="pwBtn">Entrar →</button>',
      '  </div>',
      '</div>'
    ].join(''));
    stepRoot.innerHTML = '';
    stepRoot.appendChild(node);
    var input = node.querySelector('#pw');
    var err = node.querySelector('#pwErr');
    input.focus();
    function attempt() {
      if (input.value === (CFG.facilitatorPassword || '')) {
        try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
        authed = true;
        go(evaluation ? 'qr' : 'colegio');
      } else {
        err.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
        input.value = ''; input.focus();
      }
    }
    node.querySelector('#pwBtn').addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
  }

  // =========================================================================
  // PASO 2 · Colegio + fecha (crear evaluación)
  // =========================================================================
  function renderColegio() {
    var col = (evaluation && evaluation.colegio) || CFG.defaultColegio || '';
    var fecha = (evaluation && evaluation.fecha) || todayISO();
    var node = h([
      '<div class="view" style="max-width:560px;margin:0 auto">',
      '  <div class="card">',
      '    <div class="eyebrow">Paso 2 · Nueva evaluación</div>',
      '    <h1 style="margin:6px 0 4px;font-size:1.6rem">¿En qué colegio la aplicas?</h1>',
      '    <p style="margin:0 0 12px">Con esto se crea la evaluación de este colegio para la fecha de hoy (puedes cambiarla).</p>',
      '    <div class="field">',
      '      <label for="colegioInput">Nombre del colegio</label>',
      '      <input id="colegioInput" type="text" placeholder="Ej. Colegio San Martín" autocomplete="off" value="' + esc(col) + '" />',
      '    </div>',
      '    <div class="field">',
      '      <label for="fechaInput">Fecha de la evaluación</label>',
      '      <input id="fechaInput" type="date" value="' + esc(fecha) + '" />',
      '    </div>',
      '    <p class="err" id="colErr"></p>',
      '    <button class="btn btn--primary" id="crearBtn">Crear evaluación y ver QR →</button>',
      '  </div>',
      '</div>'
    ].join(''));
    stepRoot.innerHTML = '';
    stepRoot.appendChild(node);
    var colInput = node.querySelector('#colegioInput');
    var fechaInput = node.querySelector('#fechaInput');
    var err = node.querySelector('#colErr');
    colInput.focus();
    node.querySelector('#crearBtn').addEventListener('click', function () {
      var c = colInput.value.trim();
      var f = fechaInput.value || todayISO();
      if (!c) { err.textContent = 'Escribe el nombre del colegio.'; colInput.focus(); return; }
      evaluation = { colegio: c, fecha: f };
      saveEval();
      go('qr');
    });
  }

  // =========================================================================
  // PASO 3 · QR
  // =========================================================================
  function drawQRInto(box, cellSize) {
    box.innerHTML = '';
    try {
      var qr = qrcode(0, 'M');
      qr.addData(quizUrl());
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: cellSize || 8, margin: 2, scalable: true });
      var svg = box.querySelector('svg');
      if (svg) { svg.style.width = '230px'; svg.style.height = '230px'; svg.setAttribute('role', 'img'); }
    } catch (e) { box.textContent = 'No se pudo generar el QR'; }
  }

  function fullscreenQR() {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#0b2338;z-index:9999;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:20px;cursor:pointer;padding:24px';
    var qr = qrcode(0, 'M'); qr.addData(quizUrl()); qr.make();
    var white = document.createElement('div');
    white.style.cssText = 'background:#fff;padding:24px;border-radius:24px';
    white.innerHTML = qr.createSvgTag({ cellSize: 12, margin: 2, scalable: true });
    var svg = white.querySelector('svg');
    if (svg) { svg.style.width = 'min(70vh, 70vw)'; svg.style.height = 'min(70vh, 70vw)'; }
    var cap = document.createElement('div');
    cap.style.cssText = 'color:#fff;font-weight:900;font-size:clamp(1.1rem,3vw,2rem);text-align:center';
    cap.textContent = 'Escanea para responder · ' + (evaluation ? evaluation.colegio : '');
    var sub = document.createElement('div');
    sub.style.cssText = 'color:#9fd8c8;font-weight:700;font-size:.95rem';
    sub.textContent = fmtDate(evaluation && evaluation.fecha) + ' · toca para cerrar';
    ov.appendChild(cap); ov.appendChild(white); ov.appendChild(sub);
    ov.addEventListener('click', function () { document.body.removeChild(ov); });
    document.body.appendChild(ov);
  }

  function renderQR() {
    startData(); // empieza a escuchar respuestas en segundo plano
    var node = h([
      '<div class="view">',
      '  <div class="eval-chip">🏫 ' + esc(evaluation.colegio) + ' · 📅 ' + esc(fmtDate(evaluation.fecha)) + '</div>',
      '  <div class="card" style="margin-top:12px">',
      '    <div class="eyebrow">Paso 3 · Proyecta esto en la sala</div>',
      '    <h1 style="margin:6px 0 12px">Escanea para responder</h1>',
      '    <div class="qr-panel">',
      '      <div class="qr-box" id="qrBox" aria-label="Código QR del cuestionario"></div>',
      '      <div>',
      '        <p class="lead" style="margin:0 0 8px">Cada docente escanea el código con la cámara de su teléfono y abre el cuestionario de <b>' + esc(evaluation.colegio) + '</b>.</p>',
      '        <span class="qr-url" id="qrUrl"></span>',
      '        <div class="btn-row noprint" style="margin-top:14px">',
      '          <button class="btn btn--yellow small" id="fsBtn" style="flex:0 0 auto">Pantalla completa</button>',
      '          <button class="btn btn--primary small" id="copyBtn" style="flex:0 0 auto">Copiar enlace</button>',
      '          <button class="btn btn--ghost small" id="printBtn" style="flex:0 0 auto;color:#0a6b52;border-color:#bfe0d5">Imprimir</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="btn-row wizard-nav" style="margin-top:16px">',
      '    <button class="btn btn--ghost" id="backBtn" style="flex:0 0 auto;color:#fff;border-color:rgba(255,255,255,.5)">◀ Cambiar evaluación</button>',
      '    <button class="btn btn--primary" id="toResults" style="flex:1 1 auto">Ver resultados →</button>',
      '  </div>',
      '</div>'
    ].join(''));
    stepRoot.innerHTML = '';
    stepRoot.appendChild(node);
    drawQRInto(node.querySelector('#qrBox'));
    node.querySelector('#qrUrl').textContent = quizUrl();
    node.querySelector('#fsBtn').addEventListener('click', fullscreenQR);
    node.querySelector('#printBtn').addEventListener('click', function () { window.print(); });
    node.querySelector('#copyBtn').addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(quizUrl()).then(function () {
        var t = btn.textContent; btn.textContent = '¡Copiado!';
        setTimeout(function () { btn.textContent = t; }, 1500);
      }).catch(function () { window.prompt('Copia el enlace:', quizUrl()); });
    });
    node.querySelector('#backBtn').addEventListener('click', function () { go('colegio'); });
    node.querySelector('#toResults').addEventListener('click', function () { go('resultados'); });
  }

  // =========================================================================
  // PASO 4 · Resultados (en vivo, de esta evaluación)
  // =========================================================================
  var includeAllDates = false;

  function evalRows() {
    if (!evaluation) return allRows;
    return allRows.filter(function (r) {
      if ((r.colegio || '') !== (evaluation.colegio || '')) return false;
      if (!includeAllDates && (r.fecha || '') !== (evaluation.fecha || '')) return false;
      return true;
    });
  }

  var resultsEl = null, sourceNote = null;

  function renderResultados() {
    startData();
    var node = h([
      '<div class="view">',
      '  <div class="eval-chip">🏫 ' + esc(evaluation.colegio) + ' · 📅 ' + esc(fmtDate(evaluation.fecha)) + '</div>',
      '  <div class="card res-card" style="margin-top:10px">',
      '    <div class="res-topbar">',
      '      <h1 class="res-title">Resultados</h1>',
      '      <div class="btn-row noprint" style="margin:0">',
      '        <button class="btn btn--yellow small" id="qrMini" style="flex:0 0 auto">Mostrar QR</button>',
      '        <button class="btn btn--dark small" id="refreshBtn" style="flex:0 0 auto">Actualizar</button>',
      '      </div>',
      '    </div>',
      '    <div class="res-subbar noprint">',
      '      <label class="allDates" style="margin:0"><input type="checkbox" id="allDates"' + (includeAllDates ? ' checked' : '') + ' /> Incluir todas las fechas del colegio</label>',
      '      <span class="muted" id="sourceNote" style="font-size:.76rem"></span>',
      '    </div>',
      '    <div id="results"></div>',
      '  </div>',
      '  <div class="btn-row wizard-nav" style="margin-top:16px">',
      '    <button class="btn btn--ghost" id="backQR" style="flex:0 0 auto;color:#fff;border-color:rgba(255,255,255,.5)">◀ Volver al QR</button>',
      '    <button class="btn btn--ghost" id="newEval" style="flex:0 0 auto;color:#fff;border-color:rgba(255,255,255,.5)">Nueva evaluación</button>',
      '  </div>',
      '  <p class="fineprint center hide-wide" style="color:#cfe8e0;margin-top:12px">Los resultados son anónimos y agregados. Ningún dato individual identifica a un docente.</p>',
      '</div>'
    ].join(''));
    stepRoot.innerHTML = '';
    stepRoot.appendChild(node);
    resultsEl = node.querySelector('#results');
    sourceNote = node.querySelector('#sourceNote');
    node.querySelector('#qrMini').addEventListener('click', fullscreenQR);
    node.querySelector('#refreshBtn').addEventListener('click', function () {
      if (window.CLOUD && window.CLOUD.enabled) window.CLOUD.fetchAll().then(setData).catch(function () {});
      else startData();
    });
    node.querySelector('#backQR').addEventListener('click', function () { go('qr'); });
    node.querySelector('#newEval').addEventListener('click', function () { go('colegio'); });
    node.querySelector('#allDates').addEventListener('change', function () {
      includeAllDates = this.checked; renderStats(evalRows());
    });
    updateSourceNote();
    renderStats(evalRows());
  }

  function updateSourceNote() {
    if (!sourceNote) return;
    if (window.CLOUD && window.CLOUD.enabled) sourceNote.textContent = 'Conectado a Firebase' + (CFG.firebase && CFG.firebase.projectId ? ' · proyecto ' + CFG.firebase.projectId : '') + '.';
    else if (CFG.firebase && CFG.firebase.projectId) sourceNote.textContent = 'Conectando con Firebase…';
    else if (CFG.backendUrl) sourceNote.textContent = 'Fuente: Google Sheet · pulsa «Actualizar».';
    else sourceNote.textContent = 'Sin nube: solo las respuestas de este dispositivo. Configura Firebase para juntar las de todos (ver README).';
  }

  // =========================================================================
  // Estadística y gráficos
  // =========================================================================
  var BANDS = [
    { id: 'fija', label: 'Fija', color: 'var(--band-fija)', cls: '' },
    { id: 'mixta', label: 'Mixta / en transición', color: 'var(--band-mixta)', cls: 'gray' },
    { id: 'crecimiento', label: 'Crecimiento', color: 'var(--band-crec)', cls: '' }
  ];
  function gaugePct(score) {
    var p = ((score - Q.SCORE_MIN) / (Q.SCORE_MAX - Q.SCORE_MIN)) * 100;
    return Math.max(0, Math.min(100, p));
  }
  function bandOf(row, which) {
    var id = row['band' + which];
    return id ? id : Q.bandFor(row['m' + which]).id;
  }
  function computeStats(rows) {
    var n = rows.length, sum1 = 0, sum2 = 0, sumGap = 0, mathLower = 0;
    var dist1 = { fija: 0, mixta: 0, crecimiento: 0 }, dist2 = { fija: 0, mixta: 0, crecimiento: 0 }, bySex = {};
    rows.forEach(function (r) {
      sum1 += r.m1; sum2 += r.m2;
      var gap = (typeof r.gap === 'number') ? r.gap : (r.m2 - r.m1);
      sumGap += gap;
      if (r.m2 < r.m1) mathLower++;
      dist1[bandOf(r, 1)]++; dist2[bandOf(r, 2)]++;
      var s = r.sex || 'X';
      if (!bySex[s]) bySex[s] = { n: 0, s1: 0, s2: 0, g: 0 };
      bySex[s].n++; bySex[s].s1 += r.m1; bySex[s].s2 += r.m2; bySex[s].g += gap;
    });
    return {
      n: n, m1avg: n ? sum1 / n : 0, m2avg: n ? sum2 / n : 0, gapavg: n ? sumGap / n : 0,
      mathLowerPct: n ? Math.round((mathLower / n) * 100) : 0, dist1: dist1, dist2: dist2, bySex: bySex
    };
  }
  function num(x, d) { return (Math.round(x * (d ? 10 : 1)) / (d ? 10 : 1)).toFixed(d ? 1 : 0); }

  function legendHTML() {
    return '<div class="dist-legend">' + BANDS.map(function (b) {
      return '<span class="lg"><span class="sw" style="background:' + b.color + '"></span>' + b.label + '</span>';
    }).join('') + '</div>';
  }
  function stackBar(dist, total, momentLabel) {
    var segs = BANDS.map(function (b) {
      var c = dist[b.id] || 0;
      if (!c) return '';
      var pct = total ? (c / total * 100) : 0;
      var tiny = pct < 9 ? ' tiny' : '';
      var tip = momentLabel + ' · ' + b.label + ': ' + c + ' (' + Math.round(pct) + '%)';
      return '<div class="seg ' + b.cls + tiny + '" style="flex-grow:' + pct + ';flex-basis:0;background:' + b.color + '" ' +
        'data-tip="' + esc(tip) + '">' + Math.round(pct) + '%</div>';
    }).join('');
    return '<div class="stackbar">' + segs + '</div>';
  }

  var lastNums = {};
  function countUp(el, from, to, dec, pre) {
    var start = Date.now(), dur = 650;
    function frame() {
      var t = Math.min(1, (Date.now() - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      var v = from + (to - from) * e;
      el.textContent = (pre && v > 0 ? '+' : '') + v.toFixed(dec);
      if (t < 1) requestAnimationFrame(frame);
    }
    frame();
  }
  function animateNums(container) {
    container.querySelectorAll('.js-num').forEach(function (el) {
      var key = el.getAttribute('data-key');
      var to = parseFloat(el.getAttribute('data-to'));
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var pre = el.getAttribute('data-pre') === '1';
      var from = (key in lastNums) ? lastNums[key] : 0;
      countUp(el, from, to, dec, pre);
      lastNums[key] = to;
    });
  }

  var tip = document.createElement('div');
  tip.className = 'viz-tip';
  document.body.appendChild(tip);
  function attachTips(container) {
    container.querySelectorAll('[data-tip]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { tip.textContent = el.getAttribute('data-tip'); tip.classList.add('on'); });
      el.addEventListener('mousemove', function (e) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; });
      el.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
    });
  }

  var SEX_LABEL = { F: 'Mujeres', M: 'Hombres', X: 'Sin especificar' };
  function sexTable(bySex) {
    var keys = Object.keys(bySex);
    if (!keys.length) return '';
    var rows = ['F', 'M', 'X'].filter(function (k) { return bySex[k]; }).map(function (k) {
      var g = bySex[k];
      return '<tr><td class="txt">' + (SEX_LABEL[k] || k) + '</td><td>' + g.n + '</td><td>' + num(g.s1 / g.n, 1) +
        '</td><td>' + num(g.s2 / g.n, 1) + '</td><td><b>' + (g.g / g.n >= 0 ? '+' : '') + num(g.g / g.n, 1) + '</b></td></tr>';
    }).join('');
    return [
      '<h2 class="dash-h">Sondeo agregado por sexo</h2>',
      '<p class="fineprint" style="margin:0 0 8px">Legítimo porque la escala demostró invarianza de medición por sexo. Anónimo y agregado.</p>',
      '<table class="log"><thead><tr><th class="txt">Grupo</th><th>N</th><th>Prom. M1</th><th>Prom. M2</th><th>Brecha</th></tr></thead>',
      '<tbody>' + rows + '</tbody></table>'
    ].join('');
  }

  function isLive() { return !!(window.CLOUD && window.CLOUD.enabled); }

  function statTile(k, key, to, dec, opts) {
    opts = opts || {};
    var initial = (opts.pre && to > 0 ? '+' : '') + Number(to).toFixed(dec);
    return '<div class="stat"><div class="k">' + k + '</div><div class="v">' +
      '<span class="js-num" data-key="' + key + '" data-to="' + to + '" data-dec="' + dec + '"' +
      (opts.pre ? ' data-pre="1"' : '') + '>' + initial + '</span>' + (opts.suffix || '') + '</div></div>';
  }

  function renderStats(rows) {
    if (!resultsEl) return;
    var scope = evaluation
      ? (includeAllDates
          ? 'Mostrando todas las fechas de ' + esc(evaluation.colegio)
          : 'Mostrando ' + esc(evaluation.colegio) + ' · ' + esc(fmtDate(evaluation.fecha)))
      : '';
    var liveHead = isLive()
      ? '<div class="results-head"><span class="live-pill"><span class="live-dot"></span>EN VIVO</span>' +
        '<span class="muted" style="font-size:.85rem">' + scope + '</span></div>'
      : (scope ? '<div class="results-head"><span class="muted" style="font-size:.85rem">' + scope + '</span></div>' : '');
    if (!rows.length) {
      resultsEl.innerHTML = liveHead +
        '<div class="stat"><div class="k">Sin respuestas todavía</div>' +
        '<div class="v" style="font-size:1.05rem;font-weight:800;color:var(--ink-soft)">Cuando los docentes escaneen el QR y terminen, verás aquí los promedios y la distribución.</div></div>';
      return;
    }
    var st = computeStats(rows);
    resultsEl.innerHTML = [
      liveHead,
      '<div class="stats">',
      statTile('Respuestas', 'n', st.n, 0),
      statTile('Promedio Momento 1', 'm1', +st.m1avg.toFixed(1), 1, { suffix: '<small> / 48</small>' }),
      statTile('Promedio Momento 2', 'm2', +st.m2avg.toFixed(1), 1, { suffix: '<small> / 48</small>' }),
      statTile('Brecha promedio (M2−M1)', 'gap', +st.gapavg.toFixed(1), 1, { pre: true }),
      statTile('Más “fijos” en mates', 'ml', st.mathLowerPct, 0, { suffix: '<small>%</small>' }),
      '</div>',
      // Cuerpo en dos columnas para caber en una sola pantalla (se apila en móvil).
      '<div class="dash-cols">',
      '  <div class="dash-col">',
      '    <div class="dash-block">',
      '      <h2 class="dash-h">Promedio de la sala en la escala</h2>',
      '      <div class="gauge" style="margin-top:20px"><div class="gauge-track">',
      '        <div class="gauge-mark blue" style="left:' + gaugePct(st.m1avg) + '%" data-label="M1"></div>',
      '        <div class="gauge-mark green" style="left:' + gaugePct(st.m2avg) + '%" data-label="M2"></div>',
      '      </div><div class="gauge-scale"><span>8 · fija</span><span>mixta</span><span>crecimiento · 48</span></div></div>',
      '    </div>',
      '    <div class="dash-block">',
      '      <h2 class="dash-h">Distribución por bandas</h2>',
      legendHTML(),
      '      <div class="stack-block">',
      '        <div class="stack-label"><span class="mchip blue">M1</span> En general</div>',
      stackBar(st.dist1, st.n, 'M1 · en general'),
      '        <div class="stack-label"><span class="mchip green">M2</span> En matemáticas</div>',
      stackBar(st.dist2, st.n, 'M2 · en matemáticas'),
      '      </div>',
      '    </div>',
      '  </div>',
      (CFG.askSex !== false
        ? '  <div class="dash-col"><div class="dash-block">' + sexTable(st.bySex) + '</div></div>'
        : ''),
      '</div>'
    ].join('');
    animateNums(resultsEl);
    attachTips(resultsEl);
  }

  // =========================================================================
  // Datos (Firebase en vivo / Apps Script / local) + aviso de nueva respuesta
  // =========================================================================
  var allRows = [];
  var dataStarted = false;
  var cloudUnsub = null;
  var prevTotal = null;

  function localRows() {
    try { return JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || '[]'); } catch (e) { return []; }
  }
  var toastEl = null, toastTimer = null;
  function showToast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  function setData(rows) {
    var newRows = rows || [];
    // Aviso solo si crece dentro de la evaluación actual.
    var before = evaluation ? allRows.filter(matchEval).length : allRows.length;
    allRows = newRows;
    var after = evaluation ? allRows.filter(matchEval).length : allRows.length;
    var increased = (prevTotal !== null && after > before);
    prevTotal = after;
    if (current === 'resultados') {
      renderStats(evalRows());
      updateSourceNote();
      if (increased) {
        showToast('Nueva respuesta ✓');
        var first = resultsEl && resultsEl.querySelector('.stats .stat');
        if (first) { first.classList.remove('bump'); void first.offsetWidth; first.classList.add('bump'); }
      }
    }
  }
  function matchEval(r) {
    if ((r.colegio || '') !== (evaluation.colegio || '')) return false;
    if (!includeAllDates && (r.fecha || '') !== (evaluation.fecha || '')) return false;
    return true;
  }

  function subscribeCloud() {
    if (cloudUnsub) return;
    try { cloudUnsub = window.CLOUD.subscribe(function (rows) { setData(rows); }); }
    catch (e) { window.CLOUD.fetchAll().then(setData).catch(function () { setData(localRows()); }); }
  }
  function loadBackendRest() {
    var sep = CFG.backendUrl.indexOf('?') >= 0 ? '&' : '?';
    fetch(CFG.backendUrl + sep + 'action=summary', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) { setData((data && data.results) ? data.results : (Array.isArray(data) ? data : [])); })
      .catch(function () { setData(localRows()); });
  }
  function startData() {
    if (dataStarted) return; dataStarted = true;
    if (window.CLOUD && window.CLOUD.enabled) { subscribeCloud(); return; }
    if (CFG.firebase && CFG.firebase.projectId) {
      window.addEventListener('cloud-ready', function () { subscribeCloud(); updateSourceNote(); }, { once: true });
      window.addEventListener('cloud-failed', function () { updateSourceNote(); setData(localRows()); }, { once: true });
      return;
    }
    if (CFG.backendUrl) { loadBackendRest(); return; }
    setData(localRows());
  }

  // =========================================================================
  // Router de pasos
  // =========================================================================
  function renderStep() {
    // Solo el paso de Resultados usa todo el ancho (para caber sin scroll).
    document.body.classList.toggle('panel-wide', current === 'resultados');
    switch (current) {
      case 'login': renderLogin(); break;
      case 'colegio': renderColegio(); break;
      case 'qr': renderQR(); break;
      case 'resultados': renderResultados(); break;
      default: renderLogin();
    }
  }

  function start() {
    if (needsLogin()) current = 'login';
    else if (!evaluation) current = 'colegio';
    else current = 'qr';
    renderTopMeta(); renderStepper(); renderStep();
  }

  start();
})();
