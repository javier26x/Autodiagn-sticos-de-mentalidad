/* =============================================================================
 * Configuración de la web · Autodiagnósticos de mentalidad
 *
 * Edita SOLO este archivo para personalizar la actividad. No necesitas tocar
 * el resto del código.
 * ========================================================================== */
window.QUIZ_CONFIG = {
  // Nombre del evento (aparece en la portada y el tablero).
  eventName: 'JUMP Math · Jornada de Mentalidades · Taller 1',

  // ---------------------------------------------------------------------------
  // RESULTADOS AGREGADOS "EN LA WEB" (opcional).
  //
  // Deja backendUrl en "" y la web funciona igual: cada docente ve su propio
  // resultado y la comparación entre momentos. No se envía ni guarda nada fuera
  // de su teléfono.
  //
  // Si quieres ver TODOS los resultados juntos en el tablero (dashboard.html),
  // pega aquí la URL de tu Google Apps Script (termina en /exec). El paso a paso
  // está en el README.md, sección "Resultados en la web".
  // ---------------------------------------------------------------------------
  backendUrl: '',

  // Preguntar el sexo docente (anónimo) para el sondeo agregado.
  // La validación del instrumento demostró invarianza de medición por sexo, lo
  // que hace legítimo un sondeo agregado y anónimo. Los resultados individuales
  // siguen siendo confidenciales. Pon false para no preguntarlo.
  askSex: true
};
