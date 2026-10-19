import { Router } from 'express';
import type { Decision } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler, ErrorHttp, traducirError } from '../lib/errores';

export const swipesRouter = Router();

/** Tope de swipes por lote: el Service Worker nunca acumula tantos. */
const MAX_LOTE = 200;

interface DatosSwipe {
  autorId: string;
  objetivoId: string;
  decision: Decision;
}

/** Comprueba que un swipe tenga la forma correcta, venga de donde venga. */
function validarSwipe(crudo: unknown): DatosSwipe {
  const { autorId, objetivoId, decision } = (crudo ?? {}) as Record<string, unknown>;

  if (typeof autorId !== 'string' || typeof objetivoId !== 'string' || !autorId || !objetivoId) {
    throw new ErrorHttp(400, 'Faltan autorId u objetivoId');
  }
  if (decision !== 'LIKE' && decision !== 'PASS') {
    throw new ErrorHttp(400, 'La decisión debe ser LIKE o PASS');
  }
  if (autorId === objetivoId) {
    throw new ErrorHttp(400, 'No puedes votarte a ti mismo');
  }
  return { autorId, objetivoId, decision };
}

/**
 * Registra una decisión y comprueba si se formó un match.
 *
 * Es idempotente a propósito: la pareja (autor, objetivo) es única en la base
 * de datos y aquí se usa upsert. Eso importa porque la app puede reenviar
 * swipes guardados sin conexión, y un reenvío no debe crear duplicados ni
 * fallar.
 */
async function registrarSwipe({ autorId, objetivoId, decision }: DatosSwipe) {
  await prisma.swipe.upsert({
    where: { autorId_objetivoId: { autorId, objetivoId } },
    create: { autorId, objetivoId, decision },
    update: { decision },
  });

  if (decision !== 'LIKE') return { match: false as const };

  // ¿El otro ya me había dado like antes?
  const reciproco = await prisma.swipe.findUnique({
    where: { autorId_objetivoId: { autorId: objetivoId, objetivoId: autorId } },
  });

  if (!reciproco || reciproco.decision !== 'LIKE') return { match: false as const };

  // Se guarda siempre con el id menor primero: así la pareja es única sin
  // importar quién dio like de primero.
  const [usuarioAId, usuarioBId] = [autorId, objetivoId].sort();

  const match = await prisma.match.upsert({
    where: { usuarioAId_usuarioBId: { usuarioAId, usuarioBId } },
    create: { usuarioAId, usuarioBId },
    update: {},
    include: { usuarioA: true, usuarioB: true },
  });

  const compañero = match.usuarioAId === autorId ? match.usuarioB : match.usuarioA;
  return { match: true as const, matchId: match.id, compañero };
}

swipesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    return res.json(await registrarSwipe(validarSwipe(req.body)));
  }),
);

/**
 * Envío por lotes: lo usa el Service Worker cuando vuelve la conexión y hay
 * swipes encolados. Se procesan uno a uno para que un swipe inválido no tumbe
 * todo el lote.
 */
swipesRouter.post(
  '/lote',
  asyncHandler(async (req, res) => {
    const { swipes } = (req.body ?? {}) as { swipes?: unknown };

    if (!Array.isArray(swipes)) throw new ErrorHttp(400, 'Se esperaba un arreglo "swipes"');
    if (swipes.length > MAX_LOTE) throw new ErrorHttp(413, `Máximo ${MAX_LOTE} swipes por lote`);

    const resultados = [];
    for (const crudo of swipes) {
      const objetivoId = (crudo as { objetivoId?: unknown } | null)?.objetivoId;
      try {
        const resultado = await registrarSwipe(validarSwipe(crudo));
        resultados.push({ objetivoId, ok: true, ...resultado });
      } catch (error) {
        // Se devuelve el mensaje traducido, nunca el error crudo de la base de datos.
        resultados.push({ objetivoId, ok: false, error: traducirError(error).mensaje });
      }
    }

    return res.json({ procesados: resultados.length, resultados });
  }),
);
