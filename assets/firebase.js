/* =============================================================================
 * Capa de nube · Firebase Firestore
 *
 * Carga el SDK de Firebase (dinámicamente, solo si está configurado en
 * config.js) y expone una pequeña API en window.CLOUD:
 *   · CLOUD.submit(payload)  -> guarda un resultado anónimo
 *   · CLOUD.fetchAll()       -> lee todos los resultados (una vez)
 *   · CLOUD.subscribe(cb)    -> escucha cambios EN VIVO (para el tablero)
 *
 * Emite el evento 'cloud-ready' cuando termina de inicializar.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.QUIZ_CONFIG || {};
  var fb = CFG.firebase;
  if (!fb || !fb.projectId) return; // sin Firebase configurado: no se carga nada.

  var V = CFG.firebaseVersion || '10.12.2';
  var base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var collName = CFG.firebaseCollection || 'resultados';

  Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fs = mods[1];

    var app = appMod.initializeApp(fb);
    var db = fs.getFirestore(app);
    var col = fs.collection(db, collName);

    window.CLOUD = {
      enabled: true,
      submit: function (payload) {
        var doc = Object.assign({}, payload, { ts: fs.serverTimestamp() });
        return fs.addDoc(col, doc);
      },
      fetchAll: function () {
        return fs.getDocs(col).then(function (snap) {
          return snap.docs.map(function (d) { return d.data(); });
        });
      },
      subscribe: function (cb) {
        return fs.onSnapshot(col, function (snap) {
          cb(snap.docs.map(function (d) { return d.data(); }));
        }, function (err) {
          console.warn('Firestore onSnapshot:', err && err.message);
        });
      }
    };

    // Vaciar envíos que quedaron en cola mientras Firebase terminaba de cargar.
    var pending = window.__PENDING_SUBMITS__;
    if (pending && pending.length) {
      pending.forEach(function (p) { window.CLOUD.submit(p).catch(function () {}); });
    }
    window.__PENDING_SUBMITS__ = null;

    window.dispatchEvent(new Event('cloud-ready'));
  }).catch(function (e) {
    console.error('No se pudo inicializar Firebase:', e && e.message);
    // Marca de fallo para que el tablero no se quede "Conectando…" para siempre.
    window.dispatchEvent(new Event('cloud-failed'));
  });
})();
