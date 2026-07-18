/* =============================================================================
 * Tablero del facilitador
 *   · Puerta de contraseña (ligera, del lado del cliente)
 *   · Configuración del colegio (se incrusta en el QR)
 *   · QR para proyectar + resultados agregados EN VIVO, con filtro por colegio
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.QUIZ_CONFIG || {};
  var Q = window.QUIZ;
  var LOCAL_RESULTS_KEY = 'jump-mindset-local-results-v1';
  var COLEGIO_KEY = 'jump-facilitator-colegio';
  var AUTH_KEY = 'jump-facilitator-ok';

  // =========================================================================
  // 1) PUERTA DE CONTRASEÑA
  // =========================================================================
  function authorized() {
    var pw = CFG.facilitatorPassword || '';
    if (!pw) return true; // sin contraseña configurada
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; }
  }

  function showGate() {
    var gate = document.createElement('div');
    gate.className = 'gate';
    gate.innerHTML = [
      '<div class="card">',
      '  <div class="big-emoji center">🔒</div>',
      '  <div class="eyebrow center" style="margin-top:6px">Tablero del facilitador</div>',
      '  <h2 class="center" style="margin:6px 0 2px">Acceso protegido</h2>',
      '  <p class="center" style="margin:0 0 4px">Escribe la contraseña para ver los resultados.</p>',
      '  <div class="field">',
      '    <label for="pw">Contraseña</label>',
      '    <input id="pw" type="password" inputmode="text" autocomplete="current-password" placeholder="••••••••" />',
      '  </div>',
      '  <p class="err" id="pwErr"></p>',
      '  <button class="btn btn--primary" id="pwBtn">Entrar</button>',
      '</div>'
    ].join('');
    document.body.appendChild(gate);
    var input = gate.querySelector('#pw');
    var err = gate.querySelector('#pwErr');
    input.focus();

    function attempt() {
      if (input.value === (CFG.facilitatorPassword || '')) {
        try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
        document.body.removeChild(gate);
        startDashboard();
      } else {
        err.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
        input.value = '';
        input.focus();
      }
    }
    gate.querySelector('#pwBtn').addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
  }

  // =========================================================================
  // 2) TABLERO (se ejecuta solo tras autorizar)
  // =========================================================================
  function startDashboard() {
    var dash = document.getElementById('dash');
    dash.hidden = false;

    var qrBox = document.getElementById('qrBox');
    var qrUrlEl = document.getElementById('qrUrl');
    var resultsEl = document.getElementById('results');
    var sourceNote = document.getElementById('sourceNote');
    var filterRow = document.getElementById('filterRow');
    var colegioInput = document.getElementById('colegioInput');
    var colegioNote = document.getElementById('colegioNote');

    // Botón de bloquear (solo si hay contraseña)
    var lockBtn = document.getElementById('lockBtn');
    if (CFG.facilitatorPassword) {
      lockBtn.style.display = '';
      lockBtn.addEventListener('click', function () {
        try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
        location.reload();
      });
    }

    // --- Colegio ----------------------------------------------------------
    function getColegio() {
      try { return localStorage.getItem(COLEGIO_KEY) || CFG.defaultColegio || ''; }
      catch (e) { return CFG.defaultColegio || ''; }
    }
    function setColegio(v) {
      try { localStorage.setItem(COLEGIO_KEY, v); } catch (e) {}
    }
    colegioInput.value = getColegio();

    function quizUrl() {
      var u = new URL('index.html', window.location.href);
      var c = getColegio();
      if (c) u.searchParams.set('colegio', c);
      return u.href;
    }

    // --- QR ---------------------------------------------------------------
    function drawQR() {
      var url = quizUrl();
      try {
        var qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
        var svg = qrBox.querySelector('svg');
        if (svg) { svg.style.width = '210px'; svg.style.height = '210px'; svg.setAttribute('role', 'img'); }
      } catch (e) {
        qrBox.textContent = 'No se pudo generar el QR';
      }
      qrUrlEl.textContent = url;
    }
    drawQR();

    document.getElementById('saveColegio').addEventListener('click', function () {
      setColegio(colegioInput.value.trim());
      drawQR();
      colegioNote.textContent = colegioInput.value.trim()
        ? '✓ Guardado. El QR ahora etiqueta cada respuesta con «' + colegioInput.value.trim() + '».'
        : 'Sin colegio: las respuestas se guardan sin etiqueta de colegio.';
      buildFilter();
      renderFiltered();
    });

    document.getElementById('copyBtn').addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(quizUrl()).then(function () {
        var t = btn.textContent; btn.textContent = '¡Copiado!';
        setTimeout(function () { btn.textContent = t; }, 1600);
      }).catch(function () { window.prompt('Copia el enlace:', quizUrl()); });
    });

    document.getElementById('printBtn').addEventListener('click', function () { window.print(); });

    document.getElementById('fsBtn').addEventListener('click', function () {
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:#2d0e63;z-index:9999;display:flex;' +
        'flex-direction:column;align-items:center;justify-content:center;gap:22px;cursor:pointer;padding:24px';
      var qr = qrcode(0, 'M'); qr.addData(quizUrl()); qr.make();
      var white = document.createElement('div');
      white.style.cssText = 'background:#fff;padding:24px;border-radius:24px';
      white.innerHTML = qr.createSvgTag({ cellSize: 12, margin: 2, scalable: true });
      var svg = white.querySelector('svg');
      if (svg) { svg.style.width = 'min(70vh, 70vw)'; svg.style.height = 'min(70vh, 70vw)'; }
      var cap = document.createElement('div');
      cap.style.cssText = 'color:#fff;font-weight:900;font-size:clamp(1.1rem,3vw,2rem);text-align:center';
      cap.textContent = getColegio() ? ('Escanea para responder · ' + getColegio()) : 'Escanea para responder';
      var hint = document.createElement('div');
      hint.style.cssText = 'color:#c9b6f2;font-weight:700;font-size:.9rem';
      hint.textContent = 'Toca para cerrar';
      ov.appendChild(cap); ov.appendChild(white); ov.appendChild(hint);
      ov.addEventListener('click', function () { document.body.removeChild(ov); });
      document.body.appendChild(ov);
    });

    // --- Datos y filtro ---------------------------------------------------
    var allRows = [];
    var filterValue = '__all__';

    function distinctColegios() {
      var set = {};
      allRows.forEach(function (r) { var c = (r.colegio || '').trim(); if (c) set[c] = true; });
      return Object.keys(set).sort();
    }

    function buildFilter() {
      var cols = distinctColegios();
      if (!cols.length) { filterRow.innerHTML = ''; return; }
      // Preseleccionar el colegio configurado si aparece en los datos.
      var current = getColegio().trim();
      if (filterValue === '__all__' && current && cols.indexOf(current) >= 0) filterValue = current;

      var opts = ['<option value="__all__">Todos los colegios</option>'].concat(
        cols.map(function (c) {
          var sel = c === filterValue ? ' selected' : '';
          return '<option value="' + esc(c) + '"' + sel + '>' + esc(c) + '</option>';
        })
      ).join('');
      filterRow.innerHTML = '<label style="font-weight:800;color:#4b415f;font-size:.85rem">Ver:</label>' +
        '<select id="colFilter">' + opts + '</select>';
      var sel = filterRow.querySelector('#colFilter');
      sel.value = filterValue;
      sel.addEventListener('change', function () { filterValue = sel.value; renderFiltered(); });
    }

    function renderFiltered() {
      var rows = filterValue === '__all__'
        ? allRows
        : allRows.filter(function (r) { return (r.colegio || '').trim() === filterValue; });
      renderStats(rows);
    }

    function setData(rows) {
      allRows = rows || [];
      buildFilter();
      renderFiltered();
    }

    // --- Estadística ------------------------------------------------------
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
        m1avg: n ? sum1 / n : 0, m2avg: n ? sum2 / n : 0, gapavg: n ? sumGap / n : 0,
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

    // --- Carga (Firebase en vivo / Apps Script / local) -------------------
    function localRows() {
      try { return JSON.parse(localStorage.getItem(LOCAL_RESULTS_KEY) || '[]'); }
      catch (e) { return []; }
    }
    var cloudUnsub = null;

    function useCloudLive() {
      sourceNote.textContent = 'Fuente: Firebase · resultados EN VIVO (se actualizan solos).';
      if (cloudUnsub) { try { cloudUnsub(); } catch (e) {} cloudUnsub = null; }
      try {
        cloudUnsub = window.CLOUD.subscribe(function (rows) { setData(rows); });
      } catch (e) {
        window.CLOUD.fetchAll().then(setData).catch(function () { setData(localRows()); });
      }
    }

    function loadBackendRest() {
      sourceNote.textContent = 'Fuente: nube (Google Sheet) · se actualiza al pulsar «Actualizar».';
      resultsEl.innerHTML = '<p class="muted">Cargando resultados…</p>';
      var sep = CFG.backendUrl.indexOf('?') >= 0 ? '&' : '?';
      fetch(CFG.backendUrl + sep + 'action=summary', { method: 'GET' })
        .then(function (r) { return r.json(); })
        .then(function (data) { setData((data && data.results) ? data.results : (Array.isArray(data) ? data : [])); })
        .catch(function () {
          sourceNote.textContent = 'No se pudo leer la nube. Mostrando solo lo de este dispositivo.';
          setData(localRows());
        });
    }

    function load() {
      if (window.CLOUD && window.CLOUD.enabled) { useCloudLive(); return; }
      if (CFG.firebase && CFG.firebase.projectId) {
        sourceNote.textContent = 'Conectando con Firebase…';
        resultsEl.innerHTML = '<p class="muted">Conectando…</p>';
        window.addEventListener('cloud-ready', useCloudLive, { once: true });
        window.addEventListener('cloud-failed', function () {
          sourceNote.textContent = 'No se pudo conectar con Firebase. Revisa la configuración y las reglas de Firestore (ver README). Mostrando solo lo de este dispositivo.';
          setData(localRows());
        }, { once: true });
        return;
      }
      if (CFG.backendUrl) { loadBackendRest(); return; }
      sourceNote.textContent = 'Sin nube configurada: se muestran solo las respuestas hechas en ESTE dispositivo. ' +
        'Configura Firebase en config.js para juntar los de todos (ver README).';
      setData(localRows());
    }

    document.getElementById('refreshBtn').addEventListener('click', function () {
      if (window.CLOUD && window.CLOUD.enabled) {
        window.CLOUD.fetchAll().then(setData).catch(function () {});
      } else { load(); }
    });

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    load();
  }

  // =========================================================================
  // Arranque
  // =========================================================================
  if (authorized()) startDashboard();
  else showGate();
})();
