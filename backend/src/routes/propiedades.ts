import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler, ErrorHttp } from '../lib/errores';

export const propiedadesRouter = Router();

/** El precio es un Int de PostgreSQL (32 bits): pasarse de ahí es un error de la base de datos. */
const PRECIO_MAXIMO = 2_000_000_000;

/** Lee ?maxPrecio=... Un valor como "abc" antes llegaba a la consulta como NaN y tumbaba el servidor. */
function leerMaxPrecio(valor: unknown): number | undefined {
  if (valor === undefined || valor === '') return undefined;

  const numero = typeof valor === 'string' ? Number(valor) : NaN;
  if (!Number.isInteger(numero) || numero < 0 || numero > PRECIO_MAXIMO) {
    throw new ErrorHttp(400, `maxPrecio debe ser un entero entre 0 y ${PRECIO_MAXIMO}`);
  }
  return numero;
}

/** Catálogo de arriendos, con filtros opcionales por ciudad y precio máximo. */
propiedadesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { ciudad } = req.query;
    const maxPrecio = leerMaxPrecio(req.query.maxPrecio);

    const where: Prisma.PropertyWhereInput = {};
    if (typeof ciudad === 'string' && ciudad && ciudad !== 'todas') where.city = ciudad;
    if (maxPrecio !== undefined) where.price = { lte: maxPrecio };

    const propiedades = await prisma.property.findMany({
      where,
      include: { landlord: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { price: 'asc' },
    });

    return res.json(propiedades);
  }),
);

/** Ciudades disponibles, para llenar el filtro sin quemarlas en el frontend. */
propiedadesRouter.get(
  '/ciudades',
  asyncHandler(async (_req, res) => {
    const ciudades = await prisma.property.findMany({
      distinct: ['city'],
      select: { city: true },
      orderBy: { city: 'asc' },
    });
    return res.json(ciudades.map((c) => c.city));
  }),
);

propiedadesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const propiedad = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { landlord: { select: { id: true, fullName: true, avatar: true } } },
    });

    if (!propiedad) throw new ErrorHttp(404, 'Propiedad no encontrada');
    return res.json(propiedad);
  }),
);
