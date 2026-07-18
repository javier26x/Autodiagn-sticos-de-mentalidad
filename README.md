# Autodiagnósticos de mentalidad · estilo Kahoot 🧠➗

Web interactiva para la **Jornada de Mentalidades (Taller 1)** de **JUMP Math 2026**.
Cada docente escanea un **QR**, responde el cuestionario en su teléfono al estilo Kahoot
(colores, una pregunta a la vez) y descubre **la brecha entre su mentalidad general y su
mentalidad en matemáticas**. El facilitador ve los **resultados agregados en la web**.

El instrumento es la **Escala de Teorías Implícitas de la Inteligencia (ITIS)** de Carol
Dweck (8 ítems), en la adaptación al español de Correa-Rojas, Grimaldo y Marcelo-Torres
(2024). El Momento 2 adapta los ítems al dominio matemático (tipo Good et al., 2012).

> Es una **reflexión personal, anónima y confidencial**: no se recoge ningún dato que
> identifique a nadie. Solo se guarda, si lo configuras, un **conteo agregado y anónimo**.

---

## ¿Qué incluye?

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El cuestionario para los docentes (Momento 1 → teoría → Momento 2 → resultado). |
| `dashboard.html` | Tablero del facilitador: **QR grande para proyectar** + resultados agregados. |
| `config.js` | **Lo único que necesitas editar.** Nombre del evento y (opcional) la nube. |
| `apps-script.gs` | Backend gratis para juntar los resultados de todos en una Hoja de Google. |
| `assets/` | Estilos, lógica y la imagen `qr-cuestionario.png` (por si prefieres imprimirla). |

---

## Puesta en marcha (2 pasos)

### 1) Publica la web con GitHub Pages
1. En este repositorio de GitHub ve a **Settings ▸ Pages**.
2. En **Source** elige **Deploy from a branch**.
3. Branch: `main` (o la rama donde esté este código) · carpeta `/ (root)` · **Save**.
4. En 1–2 minutos tu web estará en:
   `https://javier26x.github.io/Autodiagn-sticos-de-mentalidad/`

Con esto ya funciona: cada docente responde y ve su propio resultado y su comparación.
El **QR del tablero se genera solo** apuntando a tu web, así que siempre es correcto.

### 2) Muestra el QR en la sala
Abre `…/dashboard.html`, proyéctalo y pulsa **«Pantalla completa»**.
Los docentes escanean con la cámara del teléfono y entran al cuestionario.

---

## Resultados en la web (opcional pero recomendado)

Sin configurar nada, cada docente ve **su** resultado y el tablero muestra solo las
respuestas hechas en **ese** dispositivo. Para juntar los resultados de **todos** en el
tablero, activa la nube gratis con Google:

1. Crea una **Hoja de cálculo** en <https://sheets.google.com> (vacía).
2. Menú **Extensiones ▸ Apps Script**.
3. Borra lo que haya y pega **todo** el contenido de `apps-script.gs`.
4. **Implementar ▸ Nueva implementación ▸ Aplicación web**
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
5. Copia la URL que termina en **`/exec`**.
6. Pégala en `config.js`:
   ```js
   backendUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
7. Guarda y vuelve a publicar (haz commit del cambio). Ahora `dashboard.html` muestra los
   promedios, la distribución por bandas y el sondeo por sexo de **toda** la sala, y los
   resultados quedan además en tu Hoja de Google.

---

## Cómo se calcula el puntaje

- Escala 1–6 por ítem. Cada momento suma **8 a 48 puntos** (a mayor puntaje, más
  mentalidad de crecimiento).
- Ítems de **crecimiento** (3, 5, 7, 8): puntúan **directo**.
- Ítems **fijos** (1, 2, 4, 6): puntúan **invertido** → `7 − respuesta`.
- Bandas provisionales: **8–21** fija · **22–34** mixta/transición · **35–48** crecimiento.

El objetivo pedagógico **no es el número**, sino **comparar los dos momentos**: lo más
frecuente es descubrir una mentalidad más fija en matemáticas que en general.

---

## Personalización

Edita `config.js`:
- `eventName` — el nombre que aparece en la portada y el tablero.
- `backendUrl` — la URL de Apps Script (déjala en `''` para no usar nube).
- `askSex` — `true`/`false` para pedir (o no) el sexo docente del sondeo anónimo.

Los textos del instrumento están en `assets/quiz-data.js` por si necesitas ajustarlos.

---

## Privacidad

- No se pide nombre ni ningún dato identificable.
- El progreso individual se guarda solo en el teléfono de cada docente (`localStorage`).
- Lo único que puede salir del dispositivo, si configuras la nube, son puntajes anónimos
  agregados. El sondeo por sexo es legítimo porque la escala demostró **invarianza de
  medición por sexo**, y aun así se reporta únicamente de forma agregada.

---

## Créditos

- Correa-Rojas, J., Grimaldo, M. y Marcelo-Torres, N. E. (2024). *Evidencias psicométricas
  de la Implicit Theories of Intelligence Scale (ITIS) en universitarios peruanos.*
  Interdisciplinaria, 41(1), 19–36.
- Dweck, C. S. (1999/2000). *Self-theories.* Psychology Press.
- Blackwell, L., Trzesniewski, K. y Dweck, C. S. (2007). *Child Development, 78(1),* 246–263.
- Good, C., Rattan, A. y Dweck, C. S. (2012). *JPSP, 102(4),* 700–717.

QR generado con [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).
