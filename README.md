# RoomMatch

RoomMatch conecta estudiantes y profesionales con compañeros de vivienda
compatibles, y a arrendadores con arrendatarios calificados. Combina una
experiencia de matching estilo tarjetas con una Progressive Web App (PWA)
instalable que funciona sin conexión.

> "Encuentra tu espacio. Encuentra tu match."

## Estructura del monorepo

```
RoomMatch/
├── frontend/           # React + TypeScript + Tailwind (Vite) — la PWA
├── backend/            # Node + Express + TypeScript + Prisma (PostgreSQL)
└── docker-compose.yml  # Base de datos PostgreSQL lista para usar
```

## Puesta en marcha

Requisitos: Node 20+ y Docker.

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend  (http://localhost:4000)
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev

# 3. Frontend (http://localhost:5174)
cd frontend
npm install
npm run dev
```

Para probar la PWA de verdad (instalación y modo sin conexión) hay que usar la
compilación de producción, porque en desarrollo Vite sirve el código sin
empaquetar y el Service Worker no lo cachea:

```bash
cd frontend
npm run build
npm run preview        # http://localhost:4174
```

## Despliegue en Render

El repositorio trae un [`render.yaml`](render.yaml) (Blueprint) que crea todo de una vez:

| Recurso | Qué es |
|---|---|
| `roommatch-db` | Base de datos PostgreSQL (plan gratuito) |
| `roommatch-pwa` | Un único servicio web que sirve **la API (`/api/...`) y la aplicación ya compilada** |

Que un solo servicio sirva las dos cosas es deliberado: la app y la API comparten
origen, así que no hay CORS que configurar y el Service Worker puede guardar las
respuestas de la API.

**Pasos**

1. Sube el código a GitHub (rama `main`).
2. En [render.com](https://render.com): **New → Blueprint**, elige el repositorio y la
   rama `main`. Render lee `render.yaml`.
3. **Apply**. Render crea la base de datos y el servicio y empieza a compilar (unos 3 a 6
   minutos la primera vez).
4. Cuando termine, abre la URL del servicio (`https://roommatch-pwa….onrender.com`).

No hay que configurar variables a mano: `DATABASE_URL` la entrega Render desde la base de
datos, y el resto (`NODE_ENV`, `SERVE_FRONTEND`, `AUTO_SEED`) ya están en el `render.yaml`.

**Qué ocurre en cada despliegue**

- `npm run build` instala las dependencias de `frontend` y `backend`, compila el frontend
  (Vite + Workbox) y el backend (Prisma + TypeScript).
- `npm start` aplica las migraciones (`prisma migrate deploy`) y arranca el servidor.
- Con `AUTO_SEED=true`, si la base de datos está **vacía** se crean los datos de
  demostración (usuario demo, candidatos y arriendos). Si ya hay datos, no se toca nada.
- La versión de Node se fija en [`.node-version`](.node-version) (Node 22).

**Limitaciones del plan gratuito de Render**

- El servicio se **duerme tras 15 minutos** sin visitas y tarda cerca de **1 minuto** en
  despertar. Conviene abrir la URL un par de minutos antes de presentar.
- La base de datos gratuita **se elimina a los 30 días** de crearla (con 14 días de gracia
  para pasar a un plan de pago). Solo se permite una base gratuita por cuenta.
- Al ser HTTPS, en el celular sí funcionan la instalación, los sensores y la cámara.

**Probar la versión de producción en tu computador**

```bash
npm --prefix frontend run build && npm --prefix backend run build
SERVE_FRONTEND=true npm --prefix backend run start     # http://localhost:4000
```

## Características de PWA

| Característica | Dónde está |
|---|---|
| Manifest e instalación | `frontend/public/manifest.json`, `src/hooks/useInstallPrompt.ts` |
| Service Worker generado con **Workbox** (`vite-plugin-pwa`, GenerateSW) | `frontend/vite.config.ts` → `dist/sw.js` en cada build |
| Registro y aviso de nueva versión | `src/pwa/registrarServiceWorker.ts` |
| App Shell precacheado (lista generada, nunca escrita a mano) | `vite.config.ts` → `workbox.globPatterns` |
| Estrategias de caché (Cache First para íconos, Network First para la API) | `vite.config.ts` → `workbox.runtimeCaching` |
| Funcionamiento sin conexión | Precaché + caché de la API de Workbox |
| Cola de acciones sin conexión + Background Sync | `src/pwa/colaSwipes.ts` (IndexedDB) y `public/sync-swipes.js` |
| Indicador de conexión | `src/components/IndicadorConexion.tsx` |
| IndexedDB versionada (v1 → v2 → v3, con migraciones) | `src/almacenamiento/bd.ts` |
| CRUD, índices y cursores | `src/almacenamiento/notas.ts` |
| Web Crypto: PBKDF2 + AES-GCM + SHA-256 | `src/almacenamiento/cripto.ts` |
| Notas privadas cifradas (bóveda) | `src/almacenamiento/boveda.ts`, `src/components/NotasPrivadas.tsx` |
| **Sensores de orientación**: decidir inclinando el teléfono | `src/dispositivo/sensores.ts`, `src/hooks/useInclinacion.ts` |
| **Cámara**: foto de perfil con vista previa en vivo | `src/dispositivo/camara.ts`, `src/components/CapturaFoto.tsx` |
| Foto guardada como Blob en IndexedDB | `src/almacenamiento/foto.ts` |

> El Service Worker **ya no se escribe a mano**: no existe `public/sw.js`. Lo genera
> Workbox después de cada `npm run build`, leyendo los archivos reales (con su hash)
> de `dist/`. Solo el Background Sync de los swipes es código propio
> (`public/sync-swipes.js`), porque GenerateSW no lo genera.

> La caché de archivos (Workbox, Cache Storage) y el almacenamiento de datos
> (`src/almacenamiento/`, IndexedDB) son piezas distintas con trabajos distintos:
> la primera guarda archivos para que la app abra sin internet; la segunda guarda
> datos estructurados y consultables del usuario.

## Funcionalidad

- **Descubrir**: tarjetas de posibles compañeros con porcentaje de
  compatibilidad; se aceptan o descartan arrastrando o con botones.
- **Matches**: lista de coincidencias mutuas.
- **Propiedades**: catálogo de arriendos con filtros por ciudad y precio.
- **Perfil**: datos y preferencias de convivencia del usuario, y foto de perfil
  tomada con la cámara.
- **Notas privadas**: apuntes sobre cada match, cifrados en el dispositivo con una
  contraseña que solo conoce el usuario. Nunca se envían al servidor.
- **Decidir inclinando el teléfono**: en Descubrir, la tarjeta sigue la inclinación
  del dispositivo (derecha = me interesa, izquierda = descartar). Es opcional y
  está apagado por defecto.

## Documentación

- [`docs/PRESENTACION.md`](docs/PRESENTACION.md) — guion de presentación, demo
  paso a paso y preguntas frecuentes.
