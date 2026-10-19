import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { calcularCompatibilidad } from '../lib/compatibilidad';
import { asyncHandler, ErrorHttp } from '../lib/errores';

export const matchesRouter = Router();

/** Los matches de un usuario, con los datos del compañero ya resueltos. */
matchesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const usuarioId = typeof req.query.usuarioId === 'string' ? req.query.usuarioId : '';
    if (!usuarioId) throw new ErrorHttp(400, 'Falta usuarioId');

    const yo = await prisma.user.findUnique({ where: { id: usuarioId } });
    if (!yo) throw new ErrorHttp(404, 'Usuario no encontrado');

    const matches = await prisma.match.findMany({
      where: { OR: [{ usuarioAId: usuarioId }, { usuarioBId: usuarioId }] },
      include: { usuarioA: true, usuarioB: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      matches.map((m) => {
        const compañero = m.usuarioAId === usuarioId ? m.usuarioB : m.usuarioA;
        return {
          id: m.id,
          createdAt: m.createdAt,
          compañero,
          compatibilidad: calcularCompatibilidad(yo, compañero),
        };
      }),
    );
  }),
);
