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
  var EVAL_HISTORY_KEY = 'jump-eval-history-v1';
  var EVAL_HIDDEN_KEY = 'jump-eval-hidden-v1';
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

  // Historial local de evaluaciones creadas en este dispositivo (para sugerir
  // colegios/fechas aunque todavía no tengan respuestas en la nube).
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(EVAL_HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function pushHistory(ev) {
    if (!ev || !ev.colegio) return;
    unhideEvaluation(ev); // crearla de nuevo la devuelve a la lista
    var hlist = loadHistory().filter(function (x) { return !(x.colegio === ev.colegio && x.fecha === ev.fecha); });
    hlist.unshift({ colegio: ev.colegio, fecha: ev.fecha });
    if (hlist.length > 40) hlist = hlist.slice(0, 40);
    try { localStorage.setItem(EVAL_HISTORY_KEY, JSON.stringify(hlist)); } catch (e) {}
  }
  // "Ocultas": evaluaciones quitadas de la lista con la ×. Se guarda la clave
  // colegio||fecha para que tampoco reaparezcan al venir de la nube.
  function evalKey(colegio, fecha) { return (colegio || '') + '||' + (fecha || ''); }
  function loadHidden() {
    try { return JSON.parse(localStorage.getItem(EVAL_HIDDEN_KEY) || '[]'); } catch (e) { return []; }
  }
  function hideEvaluation(ev) {
    var k = evalKey(ev.colegio, ev.fecha);
    var hid = loadHidden();
    if (hid.indexOf(k) < 0) hid.push(k);
    try { localStorage.setItem(EVAL_HIDDEN_KEY, JSON.stringify(hid)); } catch (e) {}
    var hl = loadHistory().filter(function (x) { return evalKey(x.colegio, x.fecha) !== k; });
    try { localStorage.setItem(EVAL_HISTORY_KEY, JSON.stringify(hl)); } catch (e) {}
  }
  function unhideEvaluation(ev) {
    var k = evalKey(ev.colegio, ev.fecha);
    var hid = loadHidden().filter(function (x) { return x !== k; });
    try { localStorage.setItem(EVAL_HIDDEN_KEY, JSON.stringify(hid)); } catch (e) {}
  }
  // Evaluaciones conocidas (colegio + fecha): historial local + nube, sin ocultas.
  function knownEvaluations() {
    var hidden = loadHidden();
    var seen = {}, out = [];
    function add(colegio, fecha) {
      colegio = (colegio || '').trim();
      if (!colegio) return;
      var k = evalKey(colegio, fecha || '');
      if (seen[k] || hidden.indexOf(k) >= 0) return;
      seen[k] = true;
      out.push({ colegio: colegio, fecha: fecha || '' });
    }
    loadHistory().forEach(function (e) { add(e.colegio, e.fecha); });
    (allRows || []).forEach(function (r) { add(r.colegio, r.fecha); });
    return out;
  }

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
  var colegioSuggestFn = null; // permite refrescar las sugerencias cuando llega data

  // Quita acentos/mayúsculas para filtrar ("martin" encuentra "Martín").
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function renderColegio() {
    var col = (evaluation && evaluation.colegio) || CFG.defaultColegio || '';
    var fecha = (evaluation && evaluation.fecha) || todayISO();
    var node = h([
      '<div class="view" style="max-width:560px;margin:0 auto">',
      '  <div class="card" style="overflow:visible">',
      '    <div class="eyebrow">Paso 2 · Nueva evaluación</div>',
      '    <h1 style="margin:6px 0 4px;font-size:1.6rem">¿En qué colegio la aplicas?</h1>',
      '    <p style="margin:0 0 12px">Elige un colegio que ya tiene evaluación o escribe uno nuevo.</p>',
      '    <div class="field combo">',
      '      <label for="colegioInput">Nombre del colegio</label>',
      '      <div class="combo-wrap">',
      '        <input id="colegioInput" type="text" placeholder="Escribe o elige un colegio…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="comboPanel" value="' + esc(col) + '" />',
      '        <button type="button" class="combo-toggle" id="comboToggle" aria-label="Ver colegios con evaluación">▾</button>',
      '        <div class="combo-panel hidden" id="comboPanel" role="listbox"></div>',
      '      </div>',
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
    var toggle = node.querySelector('#comboToggle');
    var panel = node.querySelector('#comboPanel');
    var err = node.querySelector('#colErr');
    var open = false, activeIdx = -1, listRef = [];

    function currentList() {
      var q = norm(colInput.value);
      var evals = knownEvaluations();
      if (!q) return evals;
      return evals.filter(function (e) { return norm(e.colegio).indexOf(q) >= 0; });
    }

    function renderPanel() {
      listRef = currentList();
      activeIdx = -1;
      if (!listRef.length) {
        var q = colInput.value.trim();
        panel.innerHTML = '<div class="combo-empty">' + (q
          ? 'Sin coincidencias. «' + esc(q) + '» se creará como colegio nuevo.'
          : 'Aún no hay colegios con evaluación: escribe el nombre del primero.') + '</div>';
        return;
      }
      panel.innerHTML = listRef.map(function (e, i) {
        return '<div class="combo-row" data-i="' + i + '" role="option">' +
          '<button type="button" class="combo-pick" data-i="' + i + '">' +
          '  <span class="cp-name">🏫 ' + esc(e.colegio) + '</span>' +
          (e.fecha ? '<span class="cp-date">' + esc(fmtDate(e.fecha)) + '</span>' : '') +
          '</button>' +
          '<button type="button" class="combo-del" data-i="' + i + '" title="Quitar de la lista" aria-label="Quitar ' + esc(e.colegio) + ' de la lista">×</button>' +
          '</div>';
      }).join('') +
      '<div class="combo-note">La × solo quita la evaluación de esta lista; las respuestas guardadas no se borran.</div>';

      // pointerdown (no click): se dispara antes del blur del input, así elegir
      // o quitar funciona aunque el panel se cierre al perder el foco.
      panel.querySelectorAll('.combo-pick').forEach(function (b) {
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          pick(parseInt(b.getAttribute('data-i'), 10));
        });
      });
      panel.querySelectorAll('.combo-del').forEach(function (b) {
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var e = listRef[parseInt(b.getAttribute('data-i'), 10)];
          hideEvaluation(e);
          showToast('Quitada de la lista');
          renderPanel();
        });
      });
    }

    function pick(i) {
      var e = listRef[i];
      if (!e) return;
      colInput.value = e.colegio;
      if (e.fecha) fechaInput.value = e.fecha;
      err.textContent = '';
      setOpen(false);
    }

    function setOpen(v) {
      open = v;
      panel.classList.toggle('hidden', !v);
      toggle.classList.toggle('open', v);
      colInput.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) renderPanel();
    }

    function moveActive(delta) {
      var rows = panel.querySelectorAll('.combo-row');
      if (!rows.length) return;
      activeIdx = (activeIdx + delta + rows.length) % rows.length;
      rows.forEach(function (r, i) { r.classList.toggle('active', i === activeIdx); });
      rows[activeIdx].scrollIntoView({ block: 'nearest' });
    }

    toggle.addEventListener('click', function () { setOpen(!open); if (open) colInput.focus(); });
    colInput.addEventListener('focus', function () { setOpen(true); });
    // Al pasar a otro campo (p. ej. la fecha) el panel se cierra y deja de tapar.
    colInput.addEventListener('blur', function () {
      setTimeout(function () {
        if (document.activeElement !== colInput) setOpen(false);
      }, 120);
    });
    colInput.addEventListener('input', function () { err.textContent = ''; if (!open) setOpen(true); else renderPanel(); });
    colInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!open) setOpen(true);
        moveActive(ev.key === 'ArrowDown' ? 1 : -1);
      } else if (ev.key === 'Enter') {
        if (open && activeIdx >= 0) { ev.preventDefault(); pick(activeIdx); }
        else setOpen(false);
      } else if (ev.key === 'Escape') { setOpen(false); }
    });

    // Cerrar al tocar fuera (listener que se autolimpia al salir del paso).
    function onDocDown(ev) {
      if (!document.body.contains(panel)) { document.removeEventListener('pointerdown', onDocDown); return; }
      if (!node.querySelector('.combo').contains(ev.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDocDown);

    colegioSuggestFn = function () { if (open) renderPanel(); };
    startData(); // trae los colegios existentes desde Firebase (refresca el panel al llegar)

    if (!col) colInput.focus();
    node.querySelector('#crearBtn').addEventListener('click', function () {
      var c = colInput.value.trim();
      var f = fechaInput.value || todayISO();
      if (!c) { err.textContent = 'Escribe o elige el nombre del colegio.'; colInput.focus(); return; }
      evaluation = { colegio: c, fecha: f };
      saveEval();
      pushHistory(evaluation);
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
      '  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">',
      '    <div class="eval-chip">🏫 ' + esc(evaluation.colegio) + ' · 📅 ' + esc(fmtDate(evaluation.fecha)) + '</div>',
      '    <div class="qr-live noprint"><span class="live-dot"></span><b id="qrCount">' + evalRows().length + '</b>&nbsp;respuestas</div>',
      '  </div>',
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

  // Un dispositivo que rehace la encuesta manda otro envío con el mismo pid:
  // nos quedamos con el último para no inflar los resultados. Los envíos
  // antiguos (sin pid) se conservan todos.
  function dedupe(rows) {
    var noPid = [], byPid = {};
    rows.forEach(function (r, idx) {
      if (!r.pid) { noPid.push(r); return; }
      var t = (r.ts && (r.ts.seconds || r.ts._seconds)) || idx;
      var prev = byPid[r.pid];
      if (!prev || t >= prev.t) byPid[r.pid] = { r: r, t: t };
    });
    return noPid.concat(Object.keys(byPid).map(function (k) { return byPid[k].r; }));
  }

  function evalRows() {
    if (!evaluation) return dedupe(allRows);
    return dedupe(allRows.filter(function (r) {
      if ((r.colegio || '') !== (evaluation.colegio || '')) return false;
      if (!includeAllDates && (r.fecha || '') !== (evaluation.fecha || '')) return false;
      return true;
    }));
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

  // Mancuernas por sexo: dos puntos (M1 y M2) unidos por una línea sobre la
  // escala 8–48. La imagen responde de un vistazo la pregunta de género.
  function sexDumbbells(bySex) {
    var groups = ['F', 'M', 'X'].filter(function (k) { return bySex[k]; });
    if (!groups.length) return '';
    var rows = groups.map(function (k) {
      var g = bySex[k];
      var a1 = g.s1 / g.n, a2 = g.s2 / g.n, gap = g.g / g.n;
      var x1 = gaugePct(a1), x2 = gaugePct(a2);
      var lo = Math.min(x1, x2), w = Math.max(Math.abs(x2 - x1), 0.5);
      var lineColor = a2 < a1 ? 'var(--band-fija)' : (a2 > a1 ? 'var(--band-crec)' : 'var(--band-mixta)');
      var gapColor = a2 < a1 ? '#c2521f' : '#0a7e62';
      return [
        '<div class="dumb-row">',
        '  <div class="dumb-head"><b>' + (SEX_LABEL[k] || k) + '</b><span class="muted"> · ' + g.n + ' resp.</span>',
        '  <span class="dumb-gap" style="color:' + gapColor + '">' + (gap >= 0 ? '+' : '') + num(gap, 1) + ' pts</span></div>',
        '  <div class="dumb-track">',
        '    <span class="dumb-line" style="left:' + lo + '%;width:' + w + '%;background:' + lineColor + '"></span>',
        '    <span class="dumb-dot blue" style="left:' + x1 + '%" data-tip="' + (SEX_LABEL[k] || k) + ' · M1 en general: ' + num(a1, 1) + '"></span>',
        '    <span class="dumb-dot green" style="left:' + x2 + '%" data-tip="' + (SEX_LABEL[k] || k) + ' · M2 en matemáticas: ' + num(a2, 1) + '"></span>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
    return [
      '<h2 class="dash-h">Sondeo por sexo · el salto M1→M2</h2>',
      '<p class="fineprint" style="margin:0 0 10px">Anónimo y agregado (la escala es válida por sexo). ',
      '<span class="mchip blue" style="font-size:.62rem">M1</span> general · <span class="mchip green" style="font-size:.62rem">M2</span> matemáticas.</p>',
      rows,
      '<div class="gauge-scale" style="margin-top:4px"><span>8 · fija</span><span>mixta</span><span>crecimiento · 48</span></div>'
    ].join('');
  }

  // Desglose por afirmación: promedio de puntos de crecimiento (1–6) por ítem.
  // Solo con envíos nuevos que traen el detalle (r1/r2).
  function itemStats(rows) {
    var withItems = rows.filter(function (r) {
      return Array.isArray(r.r1) && Array.isArray(r.r2) && r.r1.length === 8 && r.r2.length === 8;
    });
    if (!withItems.length) return null;
    var items = Q.MOMENTS.m1.items;
    var out = items.map(function (it, i) {
      var s1 = 0, s2 = 0;
      withItems.forEach(function (r) {
        s1 += Q.itemPoints(it.type, r.r1[i]);
        s2 += Q.itemPoints(it.type, r.r2[i]);
      });
      return { n: it.n, text: Q.MOMENTS.m2.items[i].text, type: it.type, a1: s1 / withItems.length, a2: s2 / withItems.length };
    });
    return { n: withItems.length, items: out };
  }

  function itemBlockHTML(ist) {
    // Las 2 afirmaciones con menor promedio M2 = las que se viven como más fijas.
    var lowest = ist.items.slice().sort(function (a, b) { return a.a2 - b.a2; }).slice(0, 2)
      .map(function (it) { return it.n; });
    var rows = ist.items.map(function (it) {
      var short = it.text.length > 60 ? it.text.slice(0, 57) + '…' : it.text;
      var hot = lowest.indexOf(it.n) >= 0;
      return [
        '<div class="item-row" data-tip="' + esc(it.text) + '">',
        '  <div class="item-txt"><span class="item-n">' + it.n + '</span>' + esc(short),
        (hot ? ' <span class="hot-tag">▼ más fija</span>' : ''),
        '  </div>',
        '  <div class="ib"><span class="ib-fill blue" style="width:' + ((it.a1 - 1) / 5 * 100) + '%"></span><span class="ib-val">' + it.a1.toFixed(1) + '</span></div>',
        '  <div class="ib"><span class="ib-fill green" style="width:' + ((it.a2 - 1) / 5 * 100) + '%"></span><span class="ib-val">' + it.a2.toFixed(1) + '</span></div>',
        '</div>'
      ].join('');
    }).join('');
    return [
      '<details class="itemlog dash-items">',
      '  <summary>Ver desglose por afirmación · ¿cuáles se viven como más fijas?</summary>',
      '  <p class="fineprint" style="margin:8px 0 6px">Promedio de puntos de crecimiento por afirmación (1–6): barra más corta = mirada más fija. ',
      '  <span class="mchip blue" style="font-size:.62rem">M1</span> general · <span class="mchip green" style="font-size:.62rem">M2</span> matemáticas · ' + ist.n + ' respuesta(s) con detalle.</p>',
      '  <div class="items-grid">' + rows + '</div>',
      '</details>'
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
      '      <div class="gauge" style="margin-top:30px"><div class="gauge-track">',
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
        ? '  <div class="dash-col"><div class="dash-block">' + sexDumbbells(st.bySex) + '</div></div>'
        : ''),
      '</div>',
      (function () { var ist = itemStats(rows); return ist ? itemBlockHTML(ist) : ''; })()
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
    // Aviso solo si crece dentro de la evaluación actual (ya deduplicado).
    var before = evalRows().length;
    allRows = rows || [];
    var after = evalRows().length;
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
    } else if (current === 'qr') {
      // Contador en vivo junto al QR proyectado.
      var qc = document.getElementById('qrCount');
      if (qc) {
        qc.textContent = after;
        if (increased) {
          showToast('Nueva respuesta ✓');
          var pill = qc.closest('.qr-live');
          if (pill) { pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
        }
      }
    } else if (current === 'colegio' && colegioSuggestFn) {
      // Al llegar colegios desde Firebase, refrescar el autocompletado del Paso 2.
      colegioSuggestFn();
    }
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
