/* =============================================================================
 * Autodiagnósticos de mentalidad · lógica del participante
 * Flujo: intro -> Momento 1 -> pausa (teoría) -> Momento 2 -> resultado
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.QUIZ_CONFIG || {};
  var Q = window.QUIZ;
  var root = document.getElementById('root');
  var STORE_KEY = 'jump-mindset-progress-v1';
  var LOCAL_RESULTS_KEY = 'jump-mindset-local-results-v1';

  var eventMeta = document.getElementById('eventMeta');
  if (eventMeta && CFG.eventName) eventMeta.textContent = CFG.eventName;

  // --- Estado --------------------------------------------------------------
  var state = load() || {
    stage: 'intro', // intro | m1 | pause | m2 | results
    idx: 0,
    sex: '',
    colegio: '',
    m1: [null, null, null, null, null, null, null, null],
    m2: [null, null, null, null, null, null, null, null],
    submitted: false
  };

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function reset() {
    var keepColegio = state.colegio || '';
    state = {
      stage: 'intro', idx: 0, sex: '', colegio: keepColegio,
      m1: [null, null, null, null, null, null, null, null],
      m2: [null, null, null, null, null, null, null, null],
      submitted: false
    };
    save();
    render();
  }

  // Colegio: viene en el QR (?colegio=...) o del valor por defecto de config.
  (function resolveColegio() {
    var fromUrl = new URLSearchParams(location.search).get('colegio');
    if (fromUrl != null && fromUrl !== '') { state.colegio = fromUrl; save(); }
    else if (!state.colegio) { state.colegio = CFG.defaultColegio || ''; }
  })();

  // --- Utilidades ----------------------------------------------------------
  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function show(node) {
    root.innerHTML = '';
    node.classList.add('view');
    root.appendChild(node);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function bandColorVar(bandId) {
    return bandId === 'fija' ? 'var(--band-fija)' : bandId === 'mixta' ? 'var(--band-mixta)' : 'var(--band-crec)';
  }
  function gaugePct(score) {
    var pct = ((score - Q.SCORE_MIN) / (Q.SCORE_MAX - Q.SCORE_MIN)) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  var ICONS = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0z"/></svg>'
  };

  // =========================================================================
  // VISTA: intro
  // =========================================================================
  function renderIntro() {
    var askSex = CFG.askSex !== false;
    var sexBlock = askSex ? [
      '<div class="card">',
      '  <div class="eyebrow">Sondeo anónimo (opcional)</div>',
      '  <h2 style="margin-top:6px">¿Cómo te identificas?</h2>',
      '  <p style="margin:0 0 10px">Solo para un conteo agregado y anónimo. Puedes omitirlo.</p>',
      '  <div class="chips" id="sexChips">',
      '    <button class="chip" data-sex="F" aria-pressed="false">Mujer</button>',
      '    <button class="chip" data-sex="M" aria-pressed="false">Hombre</button>',
      '    <button class="chip" data-sex="X" aria-pressed="false">Prefiero no decir</button>',
      '  </div>',
      '</div>'
    ].join('') : '';

    var schoolTag = state.colegio
      ? '<div style="display:inline-flex;align-items:center;gap:6px;background:#e8f5f0;color:#0a6b52;border-radius:999px;padding:6px 12px;font-weight:800;font-size:.82rem;margin-bottom:10px">🏫 ' + esc(state.colegio) + '</div>'
      : '';

    var node = h([
      '<div>',
      '  <div class="card">',
      '    ' + schoolTag,
      '    <div class="eyebrow">' + esc(CFG.eventName || 'JUMP Math · Jornada de Mentalidades') + '</div>',
      '    <h1>Autodiagnósticos de mentalidad</h1>',
      '    <p class="lead">Dos breves reflexiones personales para descubrir cómo ves la inteligencia… y cómo ves las matemáticas. El corazón de la actividad es <b>comparar ambas</b>.</p>',
      '    <div class="pill-row">',
      '      <span class="pill">' + ICONS.lock + ' Anónimo</span>',
      '      <span class="pill">' + ICONS.eye + ' Confidencial</span>',
      '      <span class="pill">' + ICONS.scale + ' 8 + 8 preguntas · ~4 min</span>',
      '    </div>',
      '  </div>',
      sexBlock,
      '  <div class="card">',
      '    <h2>Cómo funciona</h2>',
      '    <p style="margin:0 0 6px"><b>1.</b> Ahora respondes el <b>Momento 1</b> (mentalidad en general).</p>',
      '    <p style="margin:0 0 6px"><b>2.</b> Sigue la teoría de mentalidades del taller.</p>',
      '    <p style="margin:0 0 14px"><b>3.</b> Vuelves y respondes el <b>Momento 2</b> (mentalidad en matemáticas). Verás tu comparación.</p>',
      '    <button class="btn btn--primary" id="startBtn">Empezar el Momento 1 →</button>',
      '    <p class="fineprint center" style="margin:14px 0 0">No se recoge tu nombre ni ningún dato personal. Todo queda en este dispositivo salvo un conteo agregado y anónimo.</p>',
      '  </div>',
      '  <p class="center noprint" style="margin-top:14px"><a class="linkbtn" href="dashboard.html" style="color:#ffffff;opacity:.85">¿Eres facilitador/a? Abre el tablero y el QR →</a></p>',
      '</div>'
    ].join(''));

    if (askSex) {
      node.querySelectorAll('#sexChips .chip').forEach(function (c) {
        if (c.getAttribute('data-sex') === state.sex) c.setAttribute('aria-pressed', 'true');
        c.addEventListener('click', function () {
          var val = c.getAttribute('data-sex');
          state.sex = (state.sex === val) ? '' : val;
          node.querySelectorAll('#sexChips .chip').forEach(function (o) {
            o.setAttribute('aria-pressed', o.getAttribute('data-sex') === state.sex ? 'true' : 'false');
          });
          save();
        });
      });
    }
    node.querySelector('#startBtn').addEventListener('click', function () {
      state.stage = 'm1'; state.idx = 0; save(); render();
    });
    show(node);
  }

  // =========================================================================
  // VISTA: pregunta (Momento 1 o 2)
  // =========================================================================
  function renderQuestion(momentId) {
    var moment = Q.MOMENTS[momentId];
    var answers = state[momentId];
    var i = state.idx;
    var item = moment.items[i];
    var total = moment.items.length;
    var answered = answers.filter(function (v) { return v !== null; }).length;
    var pct = Math.round((answered / total) * 100);

    var opts = Q.SCALE.map(function (s) {
      var sel = answers[i] === s.value ? ' selected' : '';
      return [
        '<button class="opt s' + s.value + sel + '" data-val="' + s.value + '">',
        '  <span class="n">' + s.value + '</span>',
        '  <span class="lbl">' + esc(s.label) + '</span>',
        '</button>'
      ].join('');
    }).join('');

    var node = h([
      '<div>',
      '  <div class="progress-head">',
      '    <span class="moment-badge"><span class="num">' + moment.order + '</span>' + esc(moment.subtitle) + '</span>',
      '    <span class="qcount">' + (i + 1) + ' / ' + total + '</span>',
      '  </div>',
      '  <div class="pbar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>',
      '  <div class="statement pop">',
      '    <div>',
      '      <span class="q-index">Afirmación ' + item.n + '</span>',
      '      <p>' + esc(item.text) + '</p>',
      '    </div>',
      '  </div>',
      '  <div class="scale-hint"><span>◀ En desacuerdo</span><span>De acuerdo ▶</span></div>',
      '  <div class="options">' + opts + '</div>',
      '  <div class="q-nav">',
      (i > 0 ? '<button class="linkbtn" id="backBtn" style="color:#fff">← Anterior</button>' : '<span></span>'),
      '    <span class="muted" style="color:#cfe8e0;font-size:.82rem">Toca tu respuesta</span>',
      '  </div>',
      '</div>'
    ].join(''));

    node.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var val = parseInt(b.getAttribute('data-val'), 10);
        answers[i] = val;
        save();
        node.querySelectorAll('.opt').forEach(function (o) {
          o.classList.remove('selected');
          if (o !== b) o.classList.add('dim');
        });
        b.classList.add('selected');
        setTimeout(advance, 260);
      });
    });
    var back = node.querySelector('#backBtn');
    if (back) back.addEventListener('click', function () { state.idx = Math.max(0, i - 1); save(); render(); });

    show(node);
  }

  function advance() {
    var momentId = state.stage; // 'm1' or 'm2'
    var moment = Q.MOMENTS[momentId];
    if (state.idx < moment.items.length - 1) {
      state.idx += 1; save(); render();
      return;
    }
    // Momento terminado
    if (momentId === 'm1') {
      state.stage = 'pause'; state.idx = 0; save(); render();
    } else {
      state.stage = 'results'; save(); render();
    }
  }

  // =========================================================================
  // VISTA: pausa entre momentos (después de la teoría)
  // =========================================================================
  function renderPause() {
    var m1 = Q.scoreMoment('m1', state.m1);
    var band = Q.bandFor(m1);
    var node = h([
      '<div>',
      '  <div class="card center">',
      '    <div class="big-emoji">🧠</div>',
      '    <div class="eyebrow" style="margin-top:8px">Momento 1 completado</div>',
      '    <h1 style="margin:6px 0 4px">¡Listo tu punto de partida!</h1>',
      '    <div class="score-chip"><span>Tu puntaje general:</span> <b>' + m1 + '</b><span>/ 48</span></div>',
      '    <p style="margin:6px 0 0"><b style="color:' + band.color + '">' + esc(band.name) + '</b><br>' + esc(band.reading) + '</p>',
      '  </div>',
      '  <div class="card">',
      '    <h2>Ahora viene la teoría 🎓</h2>',
      '    <p>Guardamos tu Momento 1 en este dispositivo. Sigue la explicación de mentalidades del taller y, cuando el facilitador lo indique, vuelve aquí para el <b>Momento 2</b> (tu mentalidad en matemáticas).</p>',
      '    <p class="fineprint">Puedes cerrar esta página: al volver a abrir el mismo enlace, retomas justo aquí.</p>',
      '    <button class="btn btn--yellow" id="toM2">Continuar al Momento 2 →</button>',
      '  </div>',
      '  <p class="center"><button class="linkbtn" id="resetBtn" style="color:#fff;opacity:.7">Empezar de nuevo</button></p>',
      '</div>'
    ].join(''));
    node.querySelector('#toM2').addEventListener('click', function () {
      state.stage = 'm2'; state.idx = 0; save(); render();
    });
    node.querySelector('#resetBtn').addEventListener('click', reset);
    show(node);
  }

  // =========================================================================
  // VISTA: resultado final (la comparación)
  // =========================================================================
  function renderResults() {
    var res = Q.buildResult(state.m1, state.m2, { sex: state.sex });
    submitOnce(res);

    var b1 = Q.bandFor(res.m1), b2 = Q.bandFor(res.m2);
    var gapAbs = Math.abs(res.gap);
    var gapDir = res.gap < 0 ? 'más baja en matemáticas' : (res.gap > 0 ? 'más alta en matemáticas' : 'igual en ambas');

    var node = h([
      '<div>',
      '  <div class="card center">',
      '    <div class="eyebrow">Tu resultado</div>',
      '    <h1 style="margin:6px 0 2px">Mentalidad: general vs. matemáticas</h1>',
      '    <p style="margin:0">Lo importante no es el número, sino la <b>brecha</b> entre los dos momentos.</p>',
      '  </div>',
      '  <div class="card">',
      '    <div class="compare">',
      '      <div class="moment-card m1">',
      '        <div class="tag">Momento 1</div><div class="sub">En general</div>',
      '        <div class="val"><span class="js-score" data-to="' + res.m1 + '">0</span><small> / 48</small></div>',
      '        <span class="band-tag">' + esc(shortBand(b1)) + '</span>',
      '      </div>',
      '      <div class="moment-card m2">',
      '        <div class="tag">Momento 2</div><div class="sub">En matemáticas</div>',
      '        <div class="val"><span class="js-score" data-to="' + res.m2 + '">0</span><small> / 48</small></div>',
      '        <span class="band-tag">' + esc(shortBand(b2)) + '</span>',
      '      </div>',
      '    </div>',
      '    <div class="gauge" style="margin-top:20px">',
      '      <div class="gauge-track">',
      '        <div class="gauge-mark blue" data-left="' + gaugePct(res.m1) + '" style="left:0" data-label="M1"></div>',
      '        <div class="gauge-mark green" data-left="' + gaugePct(res.m2) + '" style="left:0" data-label="M2"></div>',
      '      </div>',
      '      <div class="gauge-scale"><span>8 · fija</span><span>mixta</span><span>crecimiento · 48</span></div>',
      '    </div>',
      '    <div class="gap-box">',
      '      <h2>' + esc(res.gapInfo.headline) + '</h2>',
      '      <p class="gap-metric">Brecha: ' + (res.gap > 0 ? '+' : '') + res.gap + ' puntos (' + gapDir + ').</p>',
      '      <p style="margin:8px 0 0">' + esc(res.gapInfo.text) + '</p>',
      '    </div>',
      '    <div class="callout">',
      '      <p><b>La pregunta que ordena el cierre:</b> ¿qué me dice comparar mi mentalidad general con mi mentalidad en matemáticas? Y al cruzar hacia la enseñanza: ¿esa relación con las matemáticas llega igual a las niñas que a los niños?</p>',
      '    </div>',
      itemLog(res),
      '  </div>',
      '  <div class="card">',
      '    <p class="fineprint" style="margin-top:0">El puntaje es una fotografía, no un veredicto: la mentalidad es cultivable. Las bandas son provisionales y se recalibran tras la primera aplicación.</p>',
      '    <div class="btn-row noprint">',
      '      <button class="btn btn--ghost small" id="printBtn" style="color:#0a6b52;border-color:#bfe0d5">Guardar / imprimir</button>',
      '      <button class="btn btn--dark small" id="againBtn">Empezar de nuevo</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join(''));

    node.querySelector('#printBtn').addEventListener('click', function () { window.print(); });
    node.querySelector('#againBtn').addEventListener('click', reset);
    show(node);

    // Animaciones de revelado: conteo de puntajes + deslizar marcadores del gauge.
    node.querySelectorAll('.js-score').forEach(function (el) {
      countUp(el, parseFloat(el.getAttribute('data-to')), 0);
    });
    requestAnimationFrame(function () {
      node.querySelectorAll('.gauge-mark[data-left]').forEach(function (m) {
        m.style.left = m.getAttribute('data-left') + '%';
      });
    });
  }

  function countUp(el, to, dec) {
    var start = Date.now(), dur = 750, from = 0;
    function frame() {
      var t = Math.min(1, (Date.now() - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = (from + (to - from) * e).toFixed(dec);
      if (t < 1) requestAnimationFrame(frame);
    }
    frame();
  }

  function shortBand(b) {
    if (b.id === 'fija') return 'Predominantemente fija';
    if (b.id === 'mixta') return 'Mixta / en transición';
    return 'Predominantemente de crecimiento';
  }

  function itemLog(res) {
    var rows = Q.MOMENTS.m1.items.map(function (item, i) {
      var r1 = res.responsesM1[i], r2 = res.responsesM2[i];
      var p1 = Q.itemPoints(item.type, r1), p2 = Q.itemPoints(item.type, r2);
      return [
        '<tr>',
        '<td>' + item.n + '</td>',
        '<td><span class="badge-type ' + item.type + '">' + (item.type === 'growth' ? 'crec.' : 'fija') + '</span></td>',
        '<td>' + r1 + '</td><td><b>' + p1 + '</b></td>',
        '<td>' + r2 + '</td><td><b>' + p2 + '</b></td>',
        '</tr>'
      ].join('');
    }).join('');
    return [
      '<details class="itemlog">',
      '  <summary>Ver el detalle por ítem y cómo se calculó</summary>',
      '  <p class="fineprint">Ítems de crecimiento (3, 5, 7, 8) puntúan directo. Ítems fijos (1, 2, 4, 6) se invierten: 7 − respuesta.</p>',
      '  <table class="log">',
      '    <thead><tr><th>N°</th><th>Tipo</th><th>M1 resp.</th><th>M1 pts</th><th>M2 resp.</th><th>M2 pts</th></tr></thead>',
      '    <tbody>' + rows + '</tbody>',
      '    <tfoot><tr><td colspan="3">Total</td><td><b>' + res.m1 + '</b></td><td></td><td><b>' + res.m2 + '</b></td></tr></tfoot>',
      '  </table>',
      '</details>'
    ].join('');
  }

  // =========================================================================
  // Envío de resultados (agregado anónimo)
  // =========================================================================
  function submitOnce(res) {
    if (state.submitted) return;
    state.submitted = true; save();

    var payload = {
      m1: res.m1, m2: res.m2,
      band1: res.band1, band2: res.band2,
      gap: res.gap, sex: res.sex || '',
      colegio: state.colegio || '',
      event: CFG.eventName || ''
    };

    // 1) Siempre: guardar en este dispositivo (modo quiosco / respaldo del tablero).
    try {
      var arr = JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || '[]');
      arr.push(payload);
      localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(arr));
    } catch (e) {}

    // 2) Enviar al agregado en la nube, según lo configurado.
    if (window.CLOUD && window.CLOUD.enabled) {
      // Firebase ya está listo.
      window.CLOUD.submit(payload).catch(function () {});
    } else if (CFG.firebase && CFG.firebase.projectId) {
      // Firebase configurado pero aún cargando: se encola y firebase.js lo envía.
      (window.__PENDING_SUBMITS__ = window.__PENDING_SUBMITS__ || []).push(payload);
    } else if (CFG.backendUrl) {
      // Alternativa: backend REST (Google Apps Script). text/plain evita el preflight CORS.
      try {
        fetch(CFG.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (e) {}
    }
  }

  // --- helpers -------------------------------------------------------------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // --- Router --------------------------------------------------------------
  function render() {
    // En móvil, durante las preguntas ocultamos la barra superior (más espacio).
    document.body.classList.toggle('is-question', state.stage === 'm1' || state.stage === 'm2');
    switch (state.stage) {
      case 'm1': renderQuestion('m1'); break;
      case 'pause': renderPause(); break;
      case 'm2': renderQuestion('m2'); break;
      case 'results': renderResults(); break;
      default: renderIntro();
    }
  }

  render();
})();
