# I18N_AUDIT.md — Auditoría previa a la internacionalización (ES/EN)

Fecha: 2026-11-04 · Rama: `feature/i18n` · Tag de respaldo: `v1-es`
Idioma por defecto y de respaldo: **español (`es`)**.

> Este documento es solo auditoría. No se ha cambiado ningún código de lógica,
> valores de CO₂, conversiones, sockets ni IDs.

---

## 1. Frontend — archivos con texto visible escrito en el código

Conteo aproximado de textos de interfaz (labels, títulos, botones, mensajes).
No incluye los textos de datos (`actions.js`, `answerLabels.js`), que van aparte.

| Archivo | Textos aprox. | Notas |
|---|---|---|
| `pages/participant/JoinSession.jsx` | ~25 | Formulario de acceso. **Contiene `GENDERS` y `AGE_RANGES` en español** (ver §6). |
| `pages/participant/Step2Calculator.jsx` | ~40 | Pantalla del calculador: navegación por áreas, botones, avisos, ayudas de tipo de pregunta. |
| `pages/participant/Step2Results.jsx` | ~45 | Resultado individual. Incluye `CATEGORY_CONFIG`, `CATEGORY_MESSAGES` (texto por categoría), comparativas ("por debajo de la media de España"). |
| `pages/participant/TeamScreen.jsx` | ~30 | Pantalla de equipo. `CATEGORY_CONFIG`, comparativas. |
| `pages/participant/WaitingRoom.jsx` | ~8 | Sala de espera. |
| `pages/participant/SessionEnd.jsx` | ~4 | Cierre de sesión. |
| `pages/facilitator/FacilitatorDashboard.jsx` | ~25 | Panel del facilitador. |
| `pages/facilitator/FacilitatorLogin.jsx` | ~12 | Login. |
| `pages/facilitator/SessionCreate.jsx` | ~18 | Creación de sesión (aquí irá el selector de idioma en Fase 4). |
| `pages/facilitator/SessionStats.jsx` | ~15 | Estadísticas. |
| `pages/facilitator/Step2Rankings.jsx` | ~50 | Rankings del facilitador. Incluye bloque de categorías con labels (`🌿 Huella reducida`, etc.) y `getCategory` local. |
| `pages/Home.jsx` | ~20 | Landing. |
| `components/Navbar.jsx` | ~6 | |
| `components/RankingViews.jsx` | ~55 | Vistas de ranking compartidas. `CATEGORY_LABELS`, `CATEGORY_LABEL_F`, subcategorías con `label` en español, leyendas de gráficos. |
| `components/SessionClosedBanner.jsx` | ~3 | |
| `components/WaitingForFacilitator.jsx` | ~2 | |

**Totales de texto de interfaz en frontend: ~360 textos** (estimación).

Observaciones de duplicación a tener en cuenta en Fase 2:
- La función `getCategory(tons)` (umbrales → `bajo/medio/alto/muy alto`) está **repetida** en: `utils/category.js` (backend), `utils/calculator.js`, `components/RankingViews.jsx`, `pages/participant/Step2Results.jsx`, `pages/participant/TeamScreen.jsx`, `pages/facilitator/Step2Rankings.jsx`. No se toca su lógica; solo se traducen las etiquetas que derivan de ella.
- Los mensajes por categoría (`CATEGORY_MESSAGES`) existen duplicados en `Step2Results.jsx` (frontend) y en `routes/results.js` (backend, email).

---

## 2. `answerLabels.js` y los dos `actions.js`

### `frontend/src/utils/answerLabels.js`
- Exporta `AREA_QUESTIONS`: array de 5 áreas (`transport`, `energy`, `food`, `consumption`, `waste`) con sus preguntas.
- Cada pregunta tiene: `id` (ID estable), `text`, `info`, `type`, y `options` con `{ value: ID, label: 'texto ES', sublabel?, emoji? }`.
- También define `areaLabel` por área: `Transporte`, `Vivienda`, `Alimentación`, `Compras y hábitos`, `Vida digital`.
- **Los `value` de las opciones son IDs** (`km_a`, `electric`, `26b`, `closeWindows`, `bigDog`…), no texto. Solo `label`/`info`/`sublabel`/`areaLabel` son texto traducible.
- **Uso**: lo consume `Step2Calculator.jsx` para renderizar el cuestionario. Los `value` (IDs) son los que se envían y los que `calculator.js` usa como clave en `MAP`. **No tocar los IDs.**

### `frontend/src/utils/actions.js`
- Exporta `ACTIONS`: 38 acciones `{ id, area, co2Reduction, label, description, image }`.
- IDs: `t01…t07` (transport), `v01…v07` (energy), `6a…`/food…, `c01…`, `d01…d05`, etc. (38 en total).
- `label` y `description` son texto ES → **movidos a `es.json` en Fase 3** (`actions.<id>.title` / `actions.<id>.description`). En el código, `label` se renombró a `title` y ahora guarda la clave i18n. `co2Reduction`, `area`, `image`, orden: **no se tocaron.**
- **Uso**: la pantalla de acciones de equipo (selección de acciones). El `id` y `co2Reduction` alimentan el cálculo de reducción.

### `backend/src/utils/actions.js`
- Exporta `ACTIONS` con la forma `{ id, area, co2Reduction, label, description }` (sin `image`), 38 acciones.
- **Uso**: backend (referencia/validación de acciones de equipo). **NO se tocó** (Fase 3 solo afecta al frontend).
- ✅ **Diff completo frontend vs backend (Fase 3)** — `co2Reduction` y `area` **idénticos en las 38**. Única diferencia de texto:
  - **`t04.label`**:
    - Frontend: `Voy en bicicleta en lugar del coche`
    - Backend: `Voy en bicicleta en lugar de utilizar el coche para mis desplazamientos diarios`
  - En `es.json` se tomó la versión del **frontend** (`actions.t04.title`). Si el backend llega a mostrar este texto al usuario (Fase 5), decidir cuál es el canónico. No se ha tocado ninguno.

---

## 3. Textos que genera el backend

- **Emails** (`backend/src/routes/results.js`, ruta `POST /send-email`):
  - `subject`: `Tu huella de carbono — X t CO₂/año`.
  - Cuerpo HTML completo en español (saludo, bloque de huella total, desglose por áreas con nombres `🚗 Transporte`, `🏡 Vivienda`, `🥗 Alimentación`, `🛍️ Compras y hábitos`, `📱 Vida digital`, `🏛️ Servicios públicos`, objetivo 2 t CO₂e 2050, bloque "esto no va solo de ti", pie "Drop. · Taller de huella de carbono · Una iniciativa de Three o'clock").
  - `CATEGORY_MESSAGES` por categoría (ES).
  - Remitente: `Drop. <noreply@apps.threeoclock.co>` ("Drop." no se traduce).
- **Mensajes de error (socket)** (`backend/src/sockets/sessionSocket.js`):
  `Error al unirse a la sesión`, `Error al unirse como equipo`, `Error al guardar huella`, `Error al confirmar acciones`, `Error al revelar step 3`.
- **Mensajes de error (HTTP)** (`backend/src/routes/*.js`):
  `Email no válido`, `Faltan datos del resultado`, `Servicio de email no configurado`, `Error al enviar el email`, `Error al obtener resultados`, `Facilitador creado`, etc.
- Estos mensajes de socket/HTTP van dirigidos sobre todo a logs/consola; los que llegan al usuario (email + algún error visible) son los relevantes para Fase 5.

---

## 4. Formateo de números y fechas

- `frontend/src/utils/format.js` → `fmtTons` usa `toFixed(2)` + `parseFloat`. **No produce coma decimal**; devuelve string con punto (JS). Candidato a `Intl.NumberFormat` en Fase 5.
- `toFixed` usado en: `calculator.js` (interno, **no tocar** — es cálculo), `RankingViews.jsx`, `TeamScreen.jsx`, `FacilitatorDashboard.jsx`, `SessionStats.jsx`, y en el email del backend (`.toFixed(1)` repetido).
- No se detecta uso de `toLocaleString`/`toLocaleDateString`/`Intl` todavía (salvo que lo introduzcamos en Fase 5).
- **Importante para Fase 5**: hoy los números se muestran con **punto** (formato JS por defecto), p.ej. `2.4 t`. El requisito es que ES muestre `2,4 t` y EN `2.4 t`. Esto es un **cambio de formato visible en español** respecto a hoy — ver nota en §7.

---

## 5. Imágenes de `frontend/public/` con posible texto incrustado

- `public/actions/*.png` (38 imágenes: `a01–a10`, `c01–c09`, `d01–d05`, `t01–t07`, `v01–v07`): ilustraciones de acciones. Por el nombre no se puede deducir si llevan texto dentro. **Pendiente de revisión visual manual** (listado en resumen final).
- `public/icons/*`: iconos; improbable que lleven texto.
- Nota: los nombres de archivo de `public/actions/` (`a01`, `c0x`, `v0x`…) **no coinciden** con los IDs de acción de `actions.js` (`t01`, `v01`, `d01`…) salvo en parte. El mapeo imagen→acción vive en el campo `image` del `actions.js` del frontend. No se toca.

---

## 6. ⚠️ MUY IMPORTANTE — Esquemas de MongoDB que guardan TEXTO en español

Revisados los 5 esquemas: `User`, `Session`, `Participant`, `FootprintResult`, `TeamActions`.

**SÍ hay campos que guardan texto español que luego se lee / compara / filtra:**

### 6.1 `FootprintResult.category` — enum en español
```js
category: { type: String, enum: ['bajo', 'medio', 'alto', 'muy alto'] }
```
- Se **guarda** (al enviar huella, vía socket y vía HTTP).
- Se **lee** de vuelta y se envía al frontend (`r.category`) en socket, rankings y stats.
- Se **compara / usa como clave**: `CATEGORY_MESSAGES[category]`, `CATEGORY_COLORS[category]`, `CATEGORY_BG[category]`, `CATEGORY_LABELS[category]`, `CATEGORY_CONFIG[category]` en email backend y en varias pantallas.
- Matiz: funcionan como **identificadores de enum estables**, no como texto mostrado (el texto visible sale de tablas `CATEGORY_LABELS`/`CATEGORY_CONFIG`). Pero el valor almacenado es una palabra española.

### 6.2 `FootprintResult.gender` — texto español literal
```js
gender: { type: String, default: '' }
```
- Valores guardados = la cadena mostrada literal: `'Mujer' | 'Hombre' | 'No binario' | 'Prefiero no decirlo'` (de `GENDERS` en `JoinSession.jsx`).
- Es **texto de display almacenado como dato** (no un ID). Hoy no se filtra por él en el backend, pero se persiste y podría mostrarse/exportarse.

### 6.3 `FootprintResult.age` — rango con un valor en español
```js
age: { type: String, default: '' }
```
- Valores: `'< 20' | '20-29' | '30-39' | '40-49' | '50-59' | '60+' | 'Prefiero no decirlo'`.
- Casi todos son neutros de idioma (números), pero `'Prefiero no decirlo'` es texto español almacenado.

### Campos que **NO** son problema (guardan IDs o datos neutros)
- `FootprintResult.answers` (Mixed): guarda **IDs** (`km_a`, `electric`, `['closeWindows']`, `bigDog`…), no texto ES. ✅
- `FootprintResult.areas.*`, `carbonTons`: números. ✅
- `group` / `Session.groups`: nombres de grupo que escribe el facilitador (contenido de usuario, no texto de app). Fuera del alcance i18n. ✅
- `Session.status` enum (`draft/waiting/active/actions/closed`): IDs en inglés. ✅
- `TeamActions.actions`: IDs de acción. ✅
- `User.email/password`: datos. ✅

**Conclusión del gate: la respuesta a "MUY IMPORTANTE" es SÍ.** Según las reglas, me detengo aquí tras el commit de Fase 0 y espero decisión sobre `category`, `gender` y `age` (ver §7).

---

## 7. Decisiones del gate — RESUELTAS (Fase 0b)

Decidido por el usuario e implementado en el commit `i18n fase 0b`:

1. **`category`** (`bajo/medio/alto/muy alto`): **se queda exactamente igual** como ID interno. Solo se traducen las etiquetas visibles con i18next. Cero migración, cero cambio de cálculo. ✅ sin cambios de código en Fase 0b.
2. **`gender`** → **IDs neutros** `female/male/nonbinary/undisclosed`.
   - `JoinSession.jsx`: `GENDERS` ahora es `{ value: ID, label: 'texto ES' }`; el `value` enviado es el ID, la etiqueta visible sigue en español (pasará a i18next en Fase 2).
   - Schema: `gender` con `enum: ['', 'female', 'male', 'nonbinary', 'undisclosed']` en `FootprintResult.js` y `Participant.js`.
   - Datos históricos: **se migran** con `scripts/migrate-gender-age.js`.
3. **`age`**: los rangos se quedan igual; solo `'Prefiero no decirlo'` → `'undisclosed'`.
   - `JoinSession.jsx`: `AGE_RANGES` ahora es `{ value, label }`; solo cambia el `value` del último.
   - Schema: `age` se deja como `String` libre (no hay cambio estructural; los rangos son abiertos). Solo cambia el valor almacenado.
   - Datos históricos: se migra ese único valor con el mismo script.

### ⚠ Orden de despliegue (importante)
El `enum` de `gender` rechaza los valores españoles antiguos **al escribir** (no al leer). Como todas las escrituras nuevas ya usan IDs neutros, el riesgo es bajo, pero conviene **ejecutar la migración antes o a la vez que se despliega** este código para que la colección quede homogénea. La migración es idempotente.

### Migración — cómo ejecutarla
Desde `backend/` (lee la conexión de `MONGODB_URI`, nunca credenciales en el código):
1. Prueba (no escribe nada, solo cuenta): `node scripts/migrate-gender-age.js --dry-run`
2. Real: `node scripts/migrate-gender-age.js`
3. Es idempotente: si se vuelve a lanzar, los valores ya migrados no se tocan; los desconocidos se listan al final sin modificarse.

---

## 8. (Reservado) Traducciones dudosas — se rellena en Fase 6.
