# RoomMatch — Material para la presentación

## 1. La idea en 30 segundos

> "RoomMatch ayuda a estudiantes y profesionales a encontrar **compañeros de
> vivienda compatibles** y arriendos. Funciona como una app de tarjetas: arrastras
> para aceptar o descartar, y cuando dos personas se aceptan mutuamente, es un
> match. Está construida como **PWA**: se instala, funciona sin internet y guarda
> tus decisiones aunque no tengas conexión."

**Problema:** compartir apartamento con alguien incompatible (horarios, orden,
presupuesto) es una de las principales causas de conflicto entre estudiantes.
**Solución:** calcular la compatibilidad *antes* de conocerse.

---

## 2. Datos clave (para diapositivas)

| Dato | Valor |
|---|---|
| Tipo de aplicación | PWA (Progressive Web App) instalable |
| Frontend | React 18 + TypeScript + Tailwind CSS, empaquetado con Vite |
| Backend | Node.js + Express + TypeScript |
| Base de datos del servidor | PostgreSQL 16 con Prisma ORM (4 tablas: `users`, `properties`, `swipes`, `matches`) |
| Datos del dispositivo | IndexedDB (cola de swipes y notas cifradas) |
| Peso de la app | JS 239 kB (76 kB comprimido) + CSS 20 kB · precaché de Workbox: 10 archivos, 273 KiB |
| Pantallas | 5: Bienvenida, Descubrir, Matches, Arriendos, Perfil |
| Datos de demostración | 10 buscadores de vivienda, 2 arrendadores, 8 propiedades |
| Endpoints de la API | 10 |

### Cómo se calcula la compatibilidad (100 puntos)

| Factor | Puntos máx. | Cómo se mide |
|---|---|---|
| Presupuesto | 30 | Qué tan cerca están (0 si difieren 50 % o más) |
| Horario | 20 | Iguales = 100 %; "flexible" encaja a medias; madrugador vs nocturno = 0 |
| Orden | 20 | Distancia en escala relajado / normal / muy ordenado |
| Vida social | 15 | Distancia en escala casero / equilibrado / social |
| Fumador | 10 | Coinciden o no |
| Mascotas | 5 | Coinciden o no |
| Intereses en común | +8 máx. | 3 puntos por interés compartido |

Cada tarjeta muestra **por qué** coinciden ("Horarios compatibles", "Presupuesto
parecido"), no solo un número. Un puntaje que se puede explicar genera confianza.

---

## 3. Los pilares PWA y dónde está cada uno

| Pilar | Qué hace | Archivo |
|---|---|---|
| **Manifest** | Nombre, íconos, color de tema y modo `standalone` para instalarla | `frontend/public/manifest.json` |
| **Service Worker (Workbox)** | Intercepta peticiones; guarda archivos y datos en caché. Lo genera `vite-plugin-pwa` en cada build | `frontend/vite.config.ts` → `dist/sw.js` |
| **Estrategias de caché** | Una distinta por tipo de recurso (ver abajo) | `vite.config.ts` → `workbox.runtimeCaching` |
| **Sin conexión** | La app abre y muestra los últimos datos aunque no haya red | Precaché de Workbox + caché de la API |
| **Background Sync** | Los swipes hechos sin internet se reenvían solos al volver la red | `public/sync-swipes.js` + `src/pwa/colaSwipes.ts` |
| **Instalación** | Botón propio "Instalar" usando `beforeinstallprompt` | `src/hooks/useInstallPrompt.ts` |
| **Actualización** | Aviso "Hay una versión nueva" en vez de recargar a la fuerza | `src/pwa/registrarServiceWorker.ts` |
| **IndexedDB** | Datos estructurados y consultables en el dispositivo | `src/almacenamiento/` |
| **Web Crypto** | Cifrado de las notas privadas | `src/almacenamiento/cripto.ts` |

### Estrategias de caché

| Recurso | Estrategia | Por qué |
|---|---|---|
| App Shell (HTML, JS y CSS con hash, manifest, íconos) | **Precaché** al instalar (`precacheAndRoute`) | Es lo mínimo para que la app abra sin red. Workbox arma la lista leyendo `dist/`, así que incluye el hash de cada archivo |
| Navegación a cualquier ruta (`/perfil`, `/matches`…) | **NavigationRoute** → `index.html` precacheado | Es una SPA: sin red, toda ruta se resuelve con el mismo `index.html` |
| Íconos (`/icons/`) | **Cache First** (`CacheFirst`) | No cambian con el mismo nombre; carga al instante |
| Datos de la API (`/api/...`) | **Network First** (`NetworkFirst`) con la caché como respaldo | Los datos deben ser frescos; la caché solo salva cuando no hay red |
| Peticiones `POST` | **Nunca se cachean** | Modifican datos; si fallan sin red, se guardan en IndexedDB |

> **Decisión que vale la pena contar:** la API empezó con *stale-while-revalidate*.
> Al volver a cargar los datos de prueba, el Service Worker devolvió un ID de
> usuario viejo desde la caché y los swipes se enviaban a un usuario que ya no
> existía. Se cambió a *network first*: en datos que cambian, la frescura importa
> más que la velocidad.

---

## 4. Notas privadas: IndexedDB + Web Crypto (Sesión 22)

**Qué es:** el usuario puede escribir apuntes sobre cada match ("quiere visitar
el sábado", "fuma en el balcón"). Esa información es sensible, así que se
**cifra en el dispositivo** y nunca viaja al servidor.

### Por qué IndexedDB y no la caché ni localStorage

| | localStorage | Cache Storage | IndexedDB |
|---|---|---|---|
| Qué guarda | Texto | Archivos (Request → Response) | **Objetos estructurados** |
| Consultas | Por clave | Por URL | **Por índice o con cursor** |
| Síncrono | Sí (bloquea la interfaz) | No | No |

Para "dame las notas de este match" o "cuántas alertas tengo" hace falta poder
**consultar por campo**, y solo IndexedDB lo permite.

### Cómo está diseñada la base de datos (`roommatch-notas`)

| Almacén | Clave | Índices | Para qué |
|---|---|---|---|
| `notas` | `id` autoincremental | `porMatch`, `porEtiqueta`, `porFecha` | Las notas |
| `config` | `clave` | — | Sal, iteraciones y verificador de la bóveda |

**Versionado y migración** (`bd.ts`):
- **v1:** almacén `notas` con índices `porMatch` y `porEtiqueta`.
- **v2:** índice `porFecha` + almacén `config`. La migración recorre las notas
  existentes con un **cursor** y les rellena la fecha (`cursor.update`), porque un
  registro sin la propiedad indexada queda fuera del índice.
- `event.oldVersion` dice desde qué versión viene cada usuario: uno nuevo salta a
  la v2; uno con la v1 solo recibe lo que le falta, **sin perder sus notas**.

**Por qué es una base aparte de la cola de swipes:** el Service Worker abre esa
otra base con una versión fija. Subirle la versión lo haría fallar con
`VersionError`. Cada base evoluciona por separado.

### Qué se cifra y qué no

| Campo | ¿Cifrado? | Razón |
|---|---|---|
| Texto de la nota | **Sí** (AES-256-GCM) | Es lo sensible |
| Etiqueta (Positivo / Pendiente / Alerta) | No | Tiene índice: permite contar y filtrar sin descifrar |
| Match al que pertenece | No | Tiene índice |
| Fecha | No | Tiene índice |
| IV | No | No es secreto, pero hace falta para descifrar |

> Esto es lo que dice la guía: **cifrar solo lo sensible, dejar el resto
> consultable.** Por eso el Perfil puede mostrar "1 nota, 0 alertas" aunque la
> bóveda esté bloqueada.

### De la contraseña a la clave

```
contraseña del usuario ─┐
                        ├─► PBKDF2-SHA256 (600 000 iteraciones) ─► clave AES-256
sal aleatoria (16 B) ───┘                                        (no exportable)
                                                                       │
texto de la nota + IV aleatorio (12 B) ──────────► AES-GCM ──────────►  ArrayBuffer cifrado
```

- **La contraseña nunca se guarda.** Se usa en el momento para derivar la clave.
- **La clave vive solo en memoria** y no es exportable: al recargar o pulsar
  "Bloquear" desaparece. Se reproduce con la misma contraseña y la misma sal.
- **La sal sí se guarda** (no es secreta), junto con el número de iteraciones y un
  *verificador*: una frase conocida, cifrada. Así se comprueba si la contraseña es
  correcta sin guardar ningún secreto.
- **El IV es distinto en cada cifrado.** Reutilizarlo con la misma clave rompe las
  garantías de AES-GCM.
- **AES-GCM detecta manipulación:** con una contraseña errónea o un dato alterado,
  `decrypt()` rechaza la promesa en vez de devolver basura.

### Una decisión consciente: 600 000 iteraciones, no 100 000

La guía usa 100 000 y avisa de que ese mínimo sube con el tiempo y conviene
revisar la recomendación vigente. La de OWASP para PBKDF2-HMAC-SHA256 es
**600 000**, así que se usó ese valor. Como el número de iteraciones se guarda
junto a la sal, subirlo en el futuro no deja inservibles las bóvedas ya creadas.

### Qué protege esto, y qué no (decirlo con honestidad suma puntos)

- ✅ Protege contra **fugas del servidor** (las notas ni siquiera llegan) y contra
  quien **lea la base de datos del navegador**.
- ❌ **No** protege contra alguien con el dispositivo **ya desbloqueado** y la
  contraseña en uso, ni contra una extensión maliciosa mientras la bóveda está abierta.
- ⚠️ Si el usuario **olvida la contraseña, no hay recuperación**: nadie puede
  descifrar sin ella. Por eso la pantalla de creación lo advierte, y existe
  "Olvidé mi contraseña", que borra todo y empieza de cero.
- ⚠️ Las notas **no se sincronizan** entre dispositivos (por diseño).
- ⚠️ `crypto.subtle` solo existe en **HTTPS o localhost**. Abierta por la IP de la
  red local con `http://`, la app lo detecta y muestra un aviso en vez de fallar.

---

## 5. Guion de demostración (6 minutos)

**Preparación (antes de presentar)**

```bash
docker compose up -d
cd backend && npm run seed && npm run dev      # terminal 1
cd frontend && npm run build && npm run preview # terminal 2  → http://localhost:4174
```

El `seed` deja a **Laura, Andrés y Valentina** con un like ya dado al usuario
demo: al aceptarlos, el match aparece en vivo.

| Min | Qué hacer | Qué decir |
|---|---|---|
| 0:00 | Abrir la bienvenida | "Es una PWA: se instala como app nativa." |
| 0:30 | **Descubrir**: arrastrar una tarjeta a la derecha | "Cada tarjeta trae un porcentaje de compatibilidad y las razones." |
| 1:00 | Aceptar a **Laura** → aparece el modal de match | "Se formó porque ella ya nos había aceptado." |
| 1:30 | **Matches** → ver la lista | — |
| 2:00 | Pulsar **🔒 Notas** en Laura → crear la contraseña → escribir una nota | "Esta nota se cifra aquí mismo; no se envía a ningún servidor." |
| 3:00 | F12 → **Application → IndexedDB → roommatch-notas → notas** | "Miren: `notaCifrada` es un ArrayBuffer ilegible. La etiqueta sí está en claro para poder buscar." |
| 3:45 | Recargar la página → abrir las notas | "La clave se perdió al recargar; pide la contraseña." |
| 4:00 | Escribir una contraseña **errónea** → "Contraseña incorrecta" → luego la correcta → **Ver nota** | "La misma contraseña y la misma sal reproducen la clave." |
| 4:45 | F12 → **Network → Offline** → recargar | "Sin internet la app sigue abriendo." |
| 5:15 | Seguir dando like estando offline | "Se guarda en IndexedDB y se envía solo al volver la conexión." |
| 5:45 | F12 → **Application → Service Workers / Cache Storage** | "Estas son las cachés que configuré en `vite.config.ts`: la del precaché y la de la API." |

**Capturas que pide la guía de la Sesión 22 (actividad 4):**
1. DevTools → Application → IndexedDB → `roommatch-notas` → `notas`, mostrando
   `notaCifrada` como `ArrayBuffer`.
2. La nota descifrada en pantalla **después de recargar** e ingresar la misma
   contraseña.

---

## 5.b Sensores y cámara (Sesiones 35 y 36)

Las guías de estas sesiones están hechas para otro proyecto (un visor 3D). Aquí se
aplicaron a RoomMatch con el equivalente más natural:

| Guía | Idea de la guía | En RoomMatch |
|---|---|---|
| Sesión 35 — sensores | Inclinar el teléfono gira un modelo 3D | **Inclinar el teléfono decide la tarjeta**: derecha = me interesa, izquierda = descartar |
| Sesión 36 — cámara | Cámara en vivo como fondo del visor, apagada con responsabilidad | **Cámara en vivo para la foto de perfil**, apagada con responsabilidad |

**Inclinación** (`Descubrir` → «Decidir inclinando el teléfono»):
- Apagada por defecto: leer sensores gasta batería y en iOS hay que pedir permiso.
- Mide relativo a una referencia (la primera lectura o «Calibrar»): nadie sostiene el
  teléfono a 0°.
- Suaviza: la tarjeta recorre un 15 % del camino que le falta por fotograma, para que
  no vibre con el temblor del sensor.
- Pasar de ±25° es una decisión. Después hay que volver cerca del centro (±10°) antes
  de decidir la siguiente: si no, con el teléfono inclinado se decidirían todas solas.
- Sin sensores (un computador) o con el permiso negado, muestra un mensaje distinto
  para cada caso y se sigue usando con botones o arrastrando.

**Cámara** (`Perfil` → «Tomar foto con la cámara»):
- Son dos capas: el `<video>` abajo y un óvalo guía encima.
- Se enciende solo con un clic. Se apaga al tomar la foto, al cerrar, al desmontar y al
  salir de la pestaña (`visibilitychange`); al volver **no** se reactiva sola.
- La foto sale cuadrada, de 480×480 JPEG (unos 10–30 KB) y se guarda como `Blob` en
  IndexedDB. No se envía al servidor.
- Cada error tiene su mensaje: permiso bloqueado, sin cámara, cámara ocupada, página
  sin HTTPS.

**Límites honestos** (decirlos suma puntos): ni los sensores ni la cámara se probaron
en un teléfono real. Se verificaron con eventos de orientación simulados y con un flujo
de video sintético. Queda pendiente probar el ruido real de los sensores, el permiso de
iOS y qué cámara abre un teléfono.

---

## 6. Preguntas que pueden hacerte

**¿Dónde está el `sw.js`?** No está en el código: lo **genera Workbox** dentro de
`dist/` en cada `npm run build`. Tiene que quedar en la raíz del sitio, porque un
Service Worker solo controla las rutas que están a su altura o por debajo.

**¿Por qué migraron a Workbox?** El Service Worker escrito a mano tenía que listar los
archivos del build, pero Vite les pone un hash que cambia en cada compilación
(`index-yjSDG8IK.js`), así que esa lista no se podía escribir a mano. El plugin corre
Workbox *después* del build, cuando esos nombres ya existen.

**¿Por qué `GenerateSW` y no `InjectManifest`?** Porque casi todo lo que hacía el
Service Worker manual lo trae Workbox. Lo único propio es el Background Sync de los
swipes, que quedó en `public/sync-swipes.js` y Workbox incluye con `importScripts`.

**¿Por qué hay un proxy de Vite hacia `/api`?** Las peticiones a otro origen
fallaban desde dentro del Service Worker (`Failed to fetch`). Con el proxy, la API
es del mismo origen: desaparece CORS y el Service Worker puede cachearla.

**¿Qué pasa si dos pestañas se abren a la vez?** Cada conexión a IndexedDB se cierra
si otra pestaña pide subir la versión (`onversionchange`), para no bloquearla.

**¿Por qué los swipes no se duplican al reenviarlos?** El servidor los trata como
*idempotentes*: la pareja (autor, objetivo) es única y se usa `upsert`.

**¿Por qué no hay login?** Alcance de la entrega: se trabaja con un usuario de
demostración. Es la mejora natural siguiente.

**¿Por qué no se actualiza el Service Worker solo?** Es deliberado: la versión nueva
queda en espera y la app avisa. Así nadie pierde lo que está escribiendo por una
recarga inesperada.

---

## 7. Qué se haría después

- Autenticación real (JWT) en lugar del usuario de demostración.
- Cambiar la contraseña de la bóveda (re-cifrar todas las notas).
- Notificaciones push cuando se forma un match.
- Auditoría con Lighthouse y migrar el Service Worker a Workbox.
