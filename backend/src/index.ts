import 'dotenv/config';

import { createApp } from './app';
import { prisma } from './lib/prisma';
import { sembrarSiVacia } from './seed';

const puerto = Number(process.env.PORT ?? 4000);

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Comprueba que la base de datos responde, con reintentos.
 *
 * ¿Por qué reintentar? Al desplegar en Render, la base de datos y el servicio
 * pueden arrancar casi a la vez, y la primera conexión a veces llega antes de que
 * PostgreSQL esté listo. Si no se reintentara, el servicio fallaría sin necesidad.
 */
async function conectarBaseDeDatos(intentos = 10, pausaMs = 3000): Promise<void> {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      if (intento === intentos) throw error;
      console.warn(`[backend] Base de datos no disponible (intento ${intento}/${intentos}). Reintentando en ${pausaMs / 1000} s…`);
      await esperar(pausaMs);
    }
  }
}

async function iniciar(): Promise<void> {
  try {
    // En producción se espera hasta ~30 s (la base de datos de Render puede
    // tardar en despertar). En local no hace falta: si Docker está apagado, se
    // avisa en unos segundos.
    const enProduccion = process.env.NODE_ENV === 'production';
    await conectarBaseDeDatos(enProduccion ? 10 : 2, enProduccion ? 3000 : 1500);
  } catch {
    console.error(
      '\n[backend] No se pudo conectar con la base de datos.\n' +
        '  · En local: ¿está corriendo Docker y la base de datos?  →  docker compose up -d\n' +
        '  · ¿DATABASE_URL apunta al lugar correcto? (backend/.env)\n' +
        '  · ¿Se aplicaron las migraciones?  →  npx prisma migrate deploy\n',
    );
    process.exit(1);
  }

  // En Render (AUTO_SEED=true) la base de datos nace vacía. Esto crea los datos de
  // demostración UNA vez; si ya hay usuarios, no toca nada.
  if (process.env.AUTO_SEED === 'true') {
    try {
      const sembro = await sembrarSiVacia();
      console.log(sembro ? '[backend] Base de datos vacía: datos de demostración creados.' : '[backend] La base de datos ya tiene datos: no se siembra.');
    } catch (error) {
      console.error('[backend] No se pudieron crear los datos de demostración:', error);
      process.exit(1);
    }
  }

  const app = createApp();
  const servidor = app.listen(puerto, () => {
    console.log(`[backend] RoomMatch escuchando en el puerto ${puerto}`);
    if (process.env.SERVE_FRONTEND === 'true') console.log('[backend] Sirviendo también el frontend compilado.');
  });

  // El error más común al programar: dejar otro backend corriendo en el mismo puerto.
  servidor.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `\n[backend] El puerto ${puerto} ya está en uso. Probablemente ya hay otro backend corriendo.\n` +
          `  → Ciérralo, o mira qué lo usa:  lsof -i :${puerto}\n`,
      );
    } else {
      console.error('[backend] Error del servidor:', error);
    }
    process.exit(1);
  });

  // Render avisa con SIGTERM antes de reemplazar el servicio al desplegar. Se
  // termina de atender lo que está en curso en vez de cortar las peticiones.
  const apagar = (senal: string) => {
    console.log(`[backend] ${senal} recibido: cerrando…`);
    servidor.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Si algo no termina, no se espera para siempre.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

iniciar();
