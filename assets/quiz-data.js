/* =============================================================================
 * Autodiagnósticos de mentalidad · JUMP Math 2026
 * Datos del instrumento, escala y algoritmo de puntuación.
 *
 * Instrumento: Escala de Teorías Implícitas de la Inteligencia (ITIS) de
 * Carol Dweck, versión de 8 ítems. Adaptación al español de
 * Correa-Rojas, Grimaldo y Marcelo-Torres (2024).
 *   · Momento 1 = mentalidad en general (inteligencia).
 *   · Momento 2 = adaptación al dominio de las matemáticas (tipo Good et al., 2012).
 *
 * Este archivo NO tiene dependencias y expone todo en window.QUIZ.
 * ========================================================================== */
(function (global) {
  'use strict';

  // Escala de respuesta 1..6 (Likert de acuerdo/desacuerdo, sin punto neutro).
  var SCALE = [
    { value: 1, short: 'Totalmente\nen desacuerdo', label: 'Totalmente en desacuerdo' },
    { value: 2, short: 'En\ndesacuerdo', label: 'En desacuerdo' },
    { value: 3, short: 'Levemente en\ndesacuerdo', label: 'Levemente en desacuerdo' },
    { value: 4, short: 'Levemente\nde acuerdo', label: 'Levemente de acuerdo' },
    { value: 5, short: 'De\nacuerdo', label: 'De acuerdo' },
    { value: 6, short: 'Totalmente\nde acuerdo', label: 'Totalmente de acuerdo' }
  ];

  // Tipo de cada ítem (por número, 1..8):
  //   · "growth"  (crecimiento / incremental): puntúa directo   -> value = respuesta
  //   · "fixed"   (fija / entidad):            puntúa invertido  -> value = 7 - respuesta
  // Ítems de crecimiento: 3, 5, 7, 8   ·   Ítems fijos: 1, 2, 4, 6
  var TYPES = ['fixed', 'fixed', 'growth', 'fixed', 'growth', 'fixed', 'growth', 'growth'];

  // Enunciados del Momento 1 · mentalidad en general.
  var STATEMENTS_M1 = [
    'Tienes una cantidad de inteligencia y no puedes hacer mucho para cambiarla.',
    'Tu inteligencia es algo acerca de ti, que realmente no puedes cambiar mucho.',
    'Sin importar quién seas, puedes cambiar significativamente tu nivel de inteligencia.',
    'Para ser honestos, realmente no se puede cambiar cuán inteligente eres.',
    'Siempre puedes cambiar sustancialmente lo inteligente que eres.',
    'Puedes aprender cosas nuevas, pero realmente no puedes cambiar tu inteligencia básica.',
    'No importa cuánta inteligencia tengas, siempre es posible incrementarla un poco más.',
    'Puede cambiar incluso tu nivel de inteligencia básica de forma considerable.'
  ];

  // Enunciados del Momento 2 · mentalidad en matemáticas (mismos ítems, dominio matemático).
  var STATEMENTS_M2 = [
    'Tienes cierta capacidad para las matemáticas y no puedes hacer mucho para cambiarla.',
    'Tu capacidad para las matemáticas es algo acerca de ti, que realmente no puedes cambiar mucho.',
    'Sin importar quién seas, puedes cambiar significativamente tu capacidad para las matemáticas.',
    'Para ser honestos, realmente no se puede cambiar cuán bueno o buena eres para las matemáticas.',
    'Siempre puedes cambiar sustancialmente lo bueno o buena que eres para las matemáticas.',
    'Puedes aprender cosas nuevas, pero realmente no puedes cambiar tu capacidad matemática básica.',
    'No importa cuánta capacidad matemática tengas, siempre es posible incrementarla un poco más.',
    'Puede cambiar incluso tu nivel básico de capacidad matemática de forma considerable.'
  ];

  function buildItems(statements) {
    return statements.map(function (text, i) {
      return { n: i + 1, text: text, type: TYPES[i] };
    });
  }

  var MOMENTS = {
    m1: {
      id: 'm1',
      order: 1,
      title: 'Momento 1',
      subtitle: 'Mi mentalidad en general',
      domain: 'general',
      instructions:
        'Lee cada afirmación y marca cuánto estás de acuerdo, del 1 al 6. ' +
        'No hay respuestas correctas ni incorrectas: responde con sinceridad, es solo para ti.',
      items: buildItems(STATEMENTS_M1)
    },
    m2: {
      id: 'm2',
      order: 2,
      title: 'Momento 2',
      subtitle: 'Mi mentalidad en matemáticas',
      domain: 'matemáticas',
      instructions:
        'Las mismas afirmaciones, ahora referidas a tu relación con las matemáticas. ' +
        'Vuelve a marcar del 1 al 6 con total sinceridad.',
      items: buildItems(STATEMENTS_M2)
    }
  };

  // Bandas provisionales (se recalibran tras la primera aplicación).
  var BANDS = [
    {
      id: 'fija',
      min: 8,
      max: 21,
      name: 'Mentalidad predominantemente fija',
      reading: 'La capacidad se vive como algo dado.',
      color: '#E21B3C'
    },
    {
      id: 'mixta',
      min: 22,
      max: 34,
      name: 'Mentalidad mixta / en transición',
      reading: 'Conviven creencias fijas y de crecimiento.',
      color: '#FFA602'
    },
    {
      id: 'crecimiento',
      min: 35,
      max: 48,
      name: 'Mentalidad predominantemente de crecimiento',
      reading: 'La capacidad se vive como cultivable.',
      color: '#26890C'
    }
  ];

  var SCORE_MIN = 8;
  var SCORE_MAX = 48;

  // Puntos de un ítem según su tipo y la respuesta marcada (1..6).
  function itemPoints(type, response) {
    return type === 'fixed' ? (7 - response) : response;
  }

  // Puntaje total de un momento a partir de las 8 respuestas (array de 1..6).
  function scoreMoment(momentId, responses) {
    var items = MOMENTS[momentId].items;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += itemPoints(items[i].type, responses[i]);
    }
    return total;
  }

  // Banda a la que pertenece un puntaje 8..48.
  function bandFor(score) {
    for (var i = 0; i < BANDS.length; i++) {
      if (score >= BANDS[i].min && score <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  // Interpretación de la brecha M1 vs M2 (el corazón de la actividad).
  function interpretGap(m1, m2) {
    var diff = m2 - m1; // positivo = más crecimiento en matemáticas
    var abs = Math.abs(diff);
    if (abs <= 3) {
      return {
        key: 'similar',
        headline: 'Tu mentalidad es parecida en ambos terrenos',
        text:
          'Tu forma de ver la inteligencia en general y tu forma de ver las matemáticas ' +
          'apuntan en una dirección muy parecida. La brecha es pequeña.'
      };
    }
    if (diff < 0) {
      return {
        key: 'math_lower',
        headline: 'Eres más “fija” con las matemáticas que con el resto',
        text:
          'Tu puntaje matemático es más bajo que el general: como a muchas personas, las ' +
          'matemáticas te despiertan una mentalidad más fija que otras áreas de tu vida. ' +
          'Ese descubrimiento es justo el que conecta con la enseñanza.'
      };
    }
    return {
      key: 'math_higher',
      headline: 'Eres más “de crecimiento” con las matemáticas',
      text:
        'Tu puntaje matemático es más alto que el general: vives las matemáticas como algo ' +
        'especialmente cultivable. Es un caso menos frecuente y vale la pena reflexionar por qué.'
    };
  }

  // Resultado completo listo para mostrar / enviar.
  function buildResult(responsesM1, responsesM2, extra) {
    var m1 = scoreMoment('m1', responsesM1);
    var m2 = scoreMoment('m2', responsesM2);
    var b1 = bandFor(m1);
    var b2 = bandFor(m2);
    return {
      m1: m1,
      m2: m2,
      band1: b1.id,
      band2: b2.id,
      band1Name: b1.name,
      band2Name: b2.name,
      gap: m2 - m1,
      gapInfo: interpretGap(m1, m2),
      sex: (extra && extra.sex) || '',
      responsesM1: responsesM1.slice(),
      responsesM2: responsesM2.slice()
    };
  }

  global.QUIZ = {
    SCALE: SCALE,
    MOMENTS: MOMENTS,
    BANDS: BANDS,
    SCORE_MIN: SCORE_MIN,
    SCORE_MAX: SCORE_MAX,
    itemPoints: itemPoints,
    scoreMoment: scoreMoment,
    bandFor: bandFor,
    interpretGap: interpretGap,
    buildResult: buildResult
  };
})(window);
