/* =============================================================================
 * Tablero del facilitador · QR + resultados agregados
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.QUIZ_CONFIG || {};
  var Q = window.QUIZ;
  var LOCAL_RESULTS_KEY = 'jump-mindset-local-results-v1';

  var qrBox = document.getElementById('qrBox');
  var qrUrlEl = document.getElementById('qrUrl');
  var resultsEl = document.getElementById('results');
  var sourceNote = document.getElementById('sourceNote');

  var quizUrl = new URL('index.html', window.location.href).href;

  // --- QR ------------------------------------------------------------------
  function drawQR() {
    try {
      var qr = qrcode(0, 'M');
      qr.addData(quizUrl);
      qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      var svg = qrBox.querySelector('svg');
      if (svg) { svg.style.width = '210px'; svg.style.height = '210px'; svg.setAttribute('role', 'img'); }
    } catch (e) {
      qrBox.textContent = 'No se pudo generar el QR';
    }
  }
  drawQR();
  qrUrlEl.textContent = quizUrl;

  document.getElementById('copyBtn').addEventListener('click', function () {
    var btn = this;
    navigator.clipboard.writeText(quizUrl).then(function () {
      var t = btn.textContent; btn.textContent = '¡Copiado!';
      setTimeout(function () { btn.textContent = t; }, 1600);
    }).catch(function () {
      window.prompt('Copia el enlace:', quizUrl);
    });
  });

  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });

  document.getElementById('fsBtn').addEventListener('click', function () {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#2d0e63;z-index:9999;display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:22px;cursor:pointer;padding:24px';
    var qr = qrcode(0, 'M'); qr.addData(quizUrl); qr.make();
    var white = document.createElement('div');
    white.style.cssText = 'background:#fff;padding:24px;border-radius:24px';
    white.innerHTML = qr.createSvgTag({ cellSize: 12, margin: 2, scalable: true });
    var svg = white.querySelector('svg');
    if (svg) { svg.style.width = 'min(70vh, 70vw)'; svg.style.height = 'min(70vh, 70vw)'; }
    var cap = document.createElement('div');
    cap.style.cssText = 'color:#fff;font-weight:900;font-size:clamp(1.1rem,3vw,2rem);text-align:center';
    cap.textContent = 'Escanea para responder';
    var hint = document.createElement('div');
    hint.style.cssText = 'color:#c9b6f2;font-weight:700;font-size:.9rem';
    hint.textContent = 'Toca para cerrar';
    ov.appendChild(cap); ov.appendChild(white); ov.appendChild(hint);
    ov.addEventListener('click', function () { document.body.removeChild(ov); });
    document.body.appendChild(ov);
  });

  // --- Estadísticas --------------------------------------------------------
  function bandOf(row, which) {
    var id = row['band' + which];
    if (id) return id;
    return Q.bandFor(row['m' + which]).id;
  }

  function computeStats(rows) {
    var n = rows.length;
    var sum1 = 0, sum2 = 0, sumGap = 0, mathLower = 0;
    var dist1 = { fija: 0, mixta: 0, crecimiento: 0 };
    var dist2 = { fija: 0, mixta: 0, crecimiento: 0 };
    var bySex = {};
    rows.forEach(function (r) {
      sum1 += r.m1; sum2 += r.m2;
      var gap = (typeof r.gap === 'number') ? r.gap : (r.m2 - r.m1);
      sumGap += gap;
      if (r.m2 < r.m1) mathLower++;
      dist1[bandOf(r, 1)]++;
      dist2[bandOf(r, 2)]++;
      var s = r.sex || 'X';
      if (!bySex[s]) bySex[s] = { n: 0, s1: 0, s2: 0, g: 0 };
      bySex[s].n++; bySex[s].s1 += r.m1; bySex[s].s2 += r.m2; bySex[s].g += gap;
    });
    return {
      n: n,
      m1avg: n ? sum1 / n : 0,
      m2avg: n ? sum2 / n : 0,
      gapavg: n ? sumGap / n : 0,
      mathLowerPct: n ? Math.round((mathLower / n) * 100) : 0,
      dist1: dist1, dist2: dist2, bySex: bySex
    };
  }

  function num(x, d) { return (Math.round(x * (d ? 10 : 1)) / (d ? 10 : 1)).toFixed(d ? 1 : 0); }

  function distBars(dist, total) {
    var order = [
      { id: 'fija', label: 'Fija', color: 'var(--band-fija)' },
      { id: 'mixta', label: 'Mixta / transición', color: 'var(--band-mixta)' },
      { id: 'crecimiento', label: 'Crecimiento', color: 'var(--band-crec)' }
    ];
    return order.map(function (b) {
      var c = dist[b.id] || 0;
      var pct = total ? Math.round((c / total) * 100) : 0;
      return [
        '<div class="dist-row">',
        '  <div class="dl"><span>' + b.label + '</span><span>' + c + ' · ' + pct + '%</span></div>',
        '  <div class="dist-bar"><span style="width:' + pct + '%;background:' + b.color + '"></span></div>',
        '</div>'
      ].join('');
    }).join('');
  }

  var SEX_LABEL = { F: 'Mujeres', M: 'Hombres', X: 'Sin especificar' };

  function sexTable(bySex) {
    var keys = Object.keys(bySex);
    if (!keys.length) return '';
    var rows = ['F', 'M', 'X'].filter(function (k) { return bySex[k]; }).map(function (k) {
      var g = bySex[k];
      return [
        '<tr>',
        '<td class="txt">' + (SEX_LABEL[k] || k) + '</td>',
        '<td>' + g.n + '</td>',
        '<td>' + num(g.s1 / g.n, 1) + '</td>',
        '<td>' + num(g.s2 / g.n, 1) + '</td>',
        '<td><b>' + (g.g / g.n >= 0 ? '+' : '') + num(g.g / g.n, 1) + '</b></td>',
        '</tr>'
      ].join('');
    }).join('');
    return [
      '<h2 style="margin:22px 0 6px">Sondeo agregado por sexo</h2>',
      '<p class="fineprint" style="margin-top:0">Legítimo porque la escala demostró invarianza de medición por sexo. Anónimo y agregado.</p>',
      '<table class="log">',
      '<thead><tr><th class="txt">Grupo</th><th>N</th><th>Prom. M1</th><th>Prom. M2</th><th>Brecha</th></tr></thead>',
      '<tbody>' + rows + '</tbody>',
      '</table>'
    ].join('');
  }

  function renderStats(rows) {
    if (!rows.length) {
      resultsEl.innerHTML = '<div class="stat" style="margin-top:12px"><div class="k">Sin respuestas todavía</div>' +
        '<div class="v" style="font-size:1.05rem;font-weight:800;color:var(--ink-soft)">Cuando los docentes completen el cuestionario, verás aquí los promedios y la distribución.</div></div>';
      return;
    }
    var st = computeStats(rows);
    var html = [
      '<div class="stats">',
      '  <div class="stat"><div class="k">Respuestas</div><div class="v">' + st.n + '</div></div>',
      '  <div class="stat"><div class="k">Promedio Momento 1</div><div class="v">' + num(st.m1avg, 1) + '<small> / 48</small></div></div>',
      '  <div class="stat"><div class="k">Promedio Momento 2</div><div class="v">' + num(st.m2avg, 1) + '<small> / 48</small></div></div>',
      '  <div class="stat"><div class="k">Brecha promedio (M2−M1)</div><div class="v">' + (st.gapavg >= 0 ? '+' : '') + num(st.gapavg, 1) + '</div></div>',
      '  <div class="stat"><div class="k">Más “fijos” en mates</div><div class="v">' + st.mathLowerPct + '<small>%</small></div></div>',
      '</div>',
      '<div class="compare" style="margin-top:18px">',
      '  <div><h2 style="font-size:1.05rem">Momento 1 · en general</h2>' + distBars(st.dist1, st.n) + '</div>',
      '  <div><h2 style="font-size:1.05rem">Momento 2 · en matemáticas</h2>' + distBars(st.dist2, st.n) + '</div>',
      '</div>',
      (CFG.askSex !== false ? sexTable(st.bySex) : '')
    ].join('');
    resultsEl.innerHTML = html;
  }

  // --- Carga de datos ------------------------------------------------------
  function localRows() {
    try { return JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  var cloudUnsub = null;

  function useCloudLive() {
    sourceNote.textContent = 'Fuente: Firebase · resultados EN VIVO (se actualizan solos).';
    if (cloudUnsub) { try { cloudUnsub(); } catch (e) {} cloudUnsub = null; }
    try {
      cloudUnsub = window.CLOUD.subscribe(function (rows) { renderStats(rows); });
    } catch (e) {
      window.CLOUD.fetchAll().then(renderStats).catch(function () { renderStats(localRows()); });
    }
  }

  function loadBackendRest() {
    sourceNote.textContent = 'Fuente: nube (Google Sheet) · se actualiza al pulsar «Actualizar».';
    resultsEl.innerHTML = '<p class="muted">Cargando resultados…</p>';
    var sep = CFG.backendUrl.indexOf('?') >= 0 ? '&' : '?';
    fetch(CFG.backendUrl + sep + 'action=summary', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rows = (data && data.results) ? data.results : (Array.isArray(data) ? data : []);
        renderStats(rows);
      })
      .catch(function () {
        sourceNote.textContent = 'No se pudo leer la nube. Mostrando solo lo de este dispositivo.';
        renderStats(localRows());
      });
  }

  function load() {
    // 1) Firebase (preferido).
    if (window.CLOUD && window.CLOUD.enabled) { useCloudLive(); return; }
    if (CFG.firebase && CFG.firebase.projectId) {
      sourceNote.textContent = 'Conectando con Firebase…';
      resultsEl.innerHTML = '<p class="muted">Conectando…</p>';
      window.addEventListener('cloud-ready', useCloudLive, { once: true });
      window.addEventListener('cloud-failed', function () {
        sourceNote.textContent = 'No se pudo conectar con Firebase. Revisa la configuración y las reglas de Firestore (ver README). Mostrando solo lo de este dispositivo.';
        renderStats(localRows());
      }, { once: true });
      return;
    }
    // 2) Backend REST alternativo (Apps Script).
    if (CFG.backendUrl) { loadBackendRest(); return; }
    // 3) Sin nube: solo este dispositivo.
    sourceNote.textContent = 'Sin nube configurada: se muestran solo las respuestas hechas en ESTE dispositivo. ' +
      'Configura Firebase en config.js para juntar los de todos (ver README).';
    renderStats(localRows());
  }

  document.getElementById('refreshBtn').addEventListener('click', function () {
    if (window.CLOUD && window.CLOUD.enabled) {
      window.CLOUD.fetchAll().then(renderStats).catch(function () {});
    } else {
      load();
    }
  });
  load();
})();
