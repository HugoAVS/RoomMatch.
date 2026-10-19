import fs from 'node:fs';
import path from 'node:path';

import compression from 'compression';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';

import { traducirError } from './lib/errores';
import { usuariosRouter } from './routes/usuarios';
import { swipesRouter } from './routes/swipes';
import { matchesRouter } from './routes/matches';
import { propiedadesRouter } from './routes/propiedades';

/**
 * Dónde queda el frontend compilado. Funciona igual desde src/ (tsx) y desde
 * dist/ (node): en los dos casos esta carpeta está dos niveles bajo la raíz del repo.
 */
const CARPETA_FRONTEND = path.resolve(__dirname, '../../frontend/dist');

/**
 * Cabeceras de caché de cada archivo del frontend. Es importante que sean
 * distintas, porque una PWA tiene archivos que NUNCA deben quedar viejos:
 *
 *  · /assets/*  llevan un hash en el nombre: si el contenido cambia, cambia el
 *    nombre. Se pueden guardar un año ("immutable").
 *  · sw.js, index.html, manifest.json y sync-swipes.js hay que revalidarlos
 *    siempre. Si el navegador guardara un sw.js viejo, las actualizaciones de la
 *    app nunca llegarían a quien ya la tiene instalada.
 */
function cabecerasEstaticas(res: Response, ruta: string): void {
  const nombre = path.basename(ruta);

  if (ruta.includes(`${path.sep}assets${path.sep}`) || /^workbox-[\w-]+\.js$/.test(nombre)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (ruta.includes(`${path.sep}icons${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  // CORS_ORIGIN admite varios orígenes separados por coma: el frontend corre
  // en un puerto en desarrollo y en otro con la compilación de producción.
  // Si el frontend lo sirve este mismo servicio (producción en Render), todo es
  // del mismo origen y CORS ni interviene.
  const origenes = (process.env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(compression());
  app.use(cors({ origin: origenes.includes('*') ? '*' : origenes }));
  app.use(express.json({ limit: '100kb' }));

  // Responde sin tocar la base de datos: es solo "el proceso está vivo". Render
  // lo usa para saber si el servicio arrancó; si dependiera de la base de datos,
  // un corte de ella haría que Render reiniciara un servicio que está sano.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'roommatch-backend' });
  });

  app.use('/api/usuarios', usuariosRouter);
  app.use('/api/swipes', swipesRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/propiedades', propiedadesRouter);

  // Una ruta /api que no existe es un 404 en JSON, no la página de la app.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // ---- Frontend (solo si se pide: en desarrollo lo sirve Vite) ----------------
  if (process.env.SERVE_FRONTEND === 'true') {
    const indexHtml = path.join(CARPETA_FRONTEND, 'index.html');

    if (!fs.existsSync(indexHtml)) {
      console.warn(`[backend] SERVE_FRONTEND=true pero no existe ${indexHtml}. ¿Se compiló el frontend?`);
    } else {
      app.use(express.static(CARPETA_FRONTEND, { index: false, setHeaders: cabecerasEstaticas }));

      // La app es una SPA: /perfil, /matches... no son archivos, y todas se
      // resuelven con el mismo index.html. Un archivo que no existe (con
      // extensión) sigue siendo un 404.
      app.get('*', (req, res, next) => {
        if (path.extname(req.path)) return next();
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexHtml);
      });
    }
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Manejador de errores. Recibe tanto los errores de las rutas (gracias a
  // asyncHandler) como los del propio Express (JSON mal formado, cuerpo
  // demasiado grande). Al cliente solo le llega un mensaje seguro; el detalle
  // completo se queda en el registro del servidor.
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const { estado, mensaje, registrar } = traducirError(error);
    if (registrar) console.error(`[backend] ${req.method} ${req.originalUrl} →`, error);
    res.status(estado).json({ error: mensaje });
  });

  return app;
}
