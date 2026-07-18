/* =============================================================================
 * Configuración de la web · Autodiagnósticos de mentalidad
 *
 * Edita SOLO este archivo para personalizar la actividad. No necesitas tocar
 * el resto del código.
 * ========================================================================== */
window.QUIZ_CONFIG = {
  // Nombre del evento (aparece en la portada y el tablero).
  eventName: 'JUMP Math · Jornada de Mentalidades · Taller 1',

  // Preguntar el sexo docente (anónimo) para el sondeo agregado.
  // La validación del instrumento demostró invarianza de medición por sexo, lo
  // que hace legítimo un sondeo agregado y anónimo. Los resultados individuales
  // siguen siendo confidenciales. Pon false para no preguntarlo.
  askSex: true,

  // ---------------------------------------------------------------------------
  // TABLERO DEL FACILITADOR
  // ---------------------------------------------------------------------------
  // Contraseña para abrir dashboard.html. Cámbiala. Déjala en '' para no pedir
  // ninguna. Nota: es una barrera ligera del lado del cliente (evita que
  // curiosos vean el tablero), no cifrado fuerte; los datos siguen siendo
  // anónimos. Para protección real, ver README (Firebase Auth).
  facilitatorPassword: 'jump2026',

  // Colegio por defecto para el que se aplica la prueba. Puedes dejarlo vacío y
  // escribirlo en el propio tablero: desde ahí se incrusta en el QR y cada
  // respuesta queda etiquetada con ese colegio.
  defaultColegio: '',

  // ---------------------------------------------------------------------------
  // RESULTADOS "EN LA WEB" con Firebase (recomendado).
  //
  // Con esto, el tablero (dashboard.html) muestra los resultados de TODA la sala
  // EN VIVO (se actualizan solos cada vez que un docente termina). Los datos son
  // anónimos (solo puntajes) y quedan en tu proyecto de Firebase.
  //
  // Falta un paso en la consola de Firebase: crear la base de datos Firestore y
  // publicar las reglas de seguridad. Ver README.md -> "Resultados en la web".
  // ---------------------------------------------------------------------------
  firebase: {
    apiKey: 'AIzaSyCtx37kYkImpiWuLr7-f-B4uVwyoxLb2bc',
    authDomain: 'autodiagnosticos-jm.firebaseapp.com',
    projectId: 'autodiagnosticos-jm',
    storageBucket: 'autodiagnosticos-jm.firebasestorage.app',
    messagingSenderId: '725486463476',
    appId: '1:725486463476:web:ac1afa42ac937e9dbe31a1'
  },
  firebaseCollection: 'resultados', // nombre de la colección en Firestore
  firebaseVersion: '10.12.2',       // versión del SDK de Firebase (CDN)

  // ---------------------------------------------------------------------------
  // Alternativa a Firebase: un backend REST (p. ej. Google Apps Script).
  // Solo se usa si NO hay firebase.projectId arriba. Ver apps-script.gs.
  // ---------------------------------------------------------------------------
  backendUrl: ''
};
