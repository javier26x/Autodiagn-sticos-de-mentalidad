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
| `index.html` | **Panel del docente** (la raíz `/`): login → colegio+fecha → QR → resultados. |
| `encuesta.html` | El cuestionario que responden los docentes (la dirección personalizada del QR). |
| `config.js` | **Lo único que necesitas editar.** Nombre del evento y configuración de Firebase. |
| `firestore.rules` | Reglas de seguridad para pegar en la consola de Firebase (una vez). |
| `apps-script.gs` | Alternativa a Firebase: backend gratis con una Hoja de Google. |
| `assets/` | Estilos, lógica y `firebase.js`. |

---

## Puesta en marcha (2 pasos)

### 1) Publica la web con GitHub Pages
1. En este repositorio de GitHub ve a **Settings ▸ Pages**.
2. En **Source** elige **Deploy from a branch**.
3. Branch: `main` (o la rama donde esté este código) · carpeta `/ (root)` · **Save**.
4. En 1–2 minutos tu web estará en:
   `https://javier26x.github.io/Autodiagn-sticos-de-mentalidad/`

La **raíz `/` es el panel del docente** (empieza por el login). El **QR se genera solo**
apuntando a `encuesta.html?colegio=…&fecha=…`, así que siempre es correcto.

**Alternativa — Firebase Hosting** (todo bajo Firebase). En una terminal o en Cloud Shell,
dentro de la carpeta del proyecto:
```bash
firebase use autodiagnosticos-jm
firebase deploy
```
El panel quedará en `https://autodiagnosticos-jm.web.app/` y el QR apuntará a
`https://autodiagnosticos-jm.web.app/encuesta.html?colegio=…&fecha=…`.

### 2) Flujo en la sala
Abre la raíz `https://autodiagnosticos-jm.web.app/` en el PC del docente, inicia sesión,
crea la evaluación (colegio + fecha) y proyecta el **QR** (botón **«Pantalla completa»**).
Los docentes lo escanean con la cámara del teléfono y responden.

---

## Resultados en la web (con Firebase)

El proyecto ya viene con **Firebase** configurado en `config.js` (proyecto
`autodiagnosticos-jm`). Con Firebase, el panel (paso 4) muestra los resultados
de **toda la sala EN VIVO**: se actualizan solos cada vez que un docente termina. Todo es
anónimo (solo puntajes).

Falta activar la base de datos y sus reglas en la consola de Firebase (una sola vez):

1. Entra a <https://console.firebase.google.com/> y abre el proyecto **autodiagnosticos-jm**.
2. Menú **Compilación ▸ Firestore Database ▸ Crear base de datos**.
   - Modo: **producción** · elige la región más cercana (p. ej. `nam5` / EE. UU.).
3. Pestaña **Reglas**: borra lo que haya, pega el contenido de **`firestore.rules`** y pulsa
   **Publicar**.
4. ¡Listo! Publica la web y prueba: crea una evaluación, escanea el QR, responde, y verás la
   respuesta aparecer sola en el paso **Resultados**. Los datos quedan en tu Firestore, en la
   colección `resultados`.

> El `apiKey` de Firebase **no es un secreto**: identifica al proyecto y está pensado para ir
> en el navegador. La seguridad la dan las **reglas de Firestore** (`firestore.rules`), que
> solo permiten crear puntajes válidos y leerlos, nunca modificarlos ni borrarlos.

### ¿Prefieres no usar Firebase?

Borra (o deja vacío) el bloque `firebase` en `config.js` y tienes dos opciones:
- **Nada**: cada docente ve su resultado y el tablero muestra solo lo de ese dispositivo.
- **Google Apps Script** (alternativa gratis con una Hoja de Google): pega `apps-script.gs`
  en Extensiones ▸ Apps Script de una hoja nueva, publícalo como *Aplicación web*
  (*Ejecutar como: Yo*, *Acceso: Cualquier usuario*) y pon su URL `/exec` en
  `config.js ▸ backendUrl`.

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
- `firebase` — la configuración de tu proyecto de Firebase (déjala si usas la nube).
- `askSex` — `true`/`false` para pedir (o no) el sexo docente del sondeo anónimo.
- `facilitatorPassword` — contraseña para abrir el tablero (`''` = sin contraseña).
- `defaultColegio` — colegio por defecto (también puedes escribirlo en el tablero).
- `backendUrl` — solo si usas la alternativa de Apps Script en vez de Firebase.

### El panel del docente (la raíz `/`, `index.html`)

Es lo primero que aparece al entrar a la web. Pensado para la pantalla del PC del docente,
es un asistente de **4 pasos**:

1. **Acceso** — contraseña (`facilitatorPassword`). Es una barrera ligera del lado del
   cliente (mantiene fuera a curiosos), no cifrado fuerte; como los datos son anónimos, es
   suficiente para el taller. Para protección real se puede añadir Firebase Auth y restringir
   la lectura por reglas.
2. **Colegio + fecha** — escribes el colegio y la fecha; con eso se **crea la evaluación**.
   Colegio y fecha se incrustan en el QR (`encuesta.html?colegio=…&fecha=…`), así **cada
   respuesta queda etiquetada** con esa evaluación.
3. **QR** — el código para proyectar en la sala (con pantalla completa e impresión).
4. **Resultados** — en vivo, **solo de esa evaluación** (con opción de incluir todas las
   fechas del colegio). Puedes volver al QR o crear una evaluación nueva cuando quieras.

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
