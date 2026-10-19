import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { calcularCompatibilidad } from '../lib/compatibilidad';
import { asyncHandler, ErrorHttp } from '../lib/errores';

export const usuariosRouter = Router();

/** El usuario con el que se demuestra la app (no hay login en este alcance). */
usuariosRouter.get(
  '/demo',
  asyncHandler(async (_req, res) => {
    const usuario = await prisma.user.findFirst({
      where: { email: 'demo@roommatch.co' },
    });

    if (!usuario) {
      throw new ErrorHttp(404, 'Falta el usuario demo. Ejecuta: npm run seed');
    }
    return res.json(usuario);
  }),
);

usuariosRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const usuario = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!usuario) throw new ErrorHttp(404, 'Usuario no encontrado');
    return res.json(usuario);
  }),
);

/* ---------------------------------------------------------------- perfil */

const TEXTOS: Record<string, { max: number; obligatorio: boolean }> = {
  fullName: { max: 80, obligatorio: true },
  ciudad: { max: 60, obligatorio: true },
  ocupacion: { max: 100, obligatorio: false },
  bio: { max: 500, obligatorio: false },
  avatar: { max: 16, obligatorio: false },
};
const ENTEROS: Record<string, { min: number; max: number }> = {
  edad: { min: 16, max: 100 },
  presupuesto: { min: 0, max: 100_000_000 },
};
const ENUMERADOS = ['horario', 'orden', 'sociabilidad'];
const BOOLEANOS = ['fumador', 'mascotas'];

/**
 * Solo se aceptan los campos editables desde la app, y cada uno con un tipo y un
 * rango razonables. Prisma ya rechazaría un tipo equivocado, pero sin tope
 * alguien podría guardar una "biografía" de varios megabytes.
 */
function validarPerfil(cuerpo: Record<string, unknown>): Record<string, unknown> {
  const datos: Record<string, unknown> = {};

  for (const [campo, { max, obligatorio }] of Object.entries(TEXTOS)) {
    const valor = cuerpo[campo];
    if (valor === undefined) continue;
    if (typeof valor !== 'string') throw new ErrorHttp(400, `"${campo}" debe ser texto`);
    if (obligatorio && valor.trim() === '') throw new ErrorHttp(400, `"${campo}" no puede estar vacío`);
    if (valor.length > max) throw new ErrorHttp(400, `"${campo}" admite como máximo ${max} caracteres`);
    datos[campo] = valor;
  }

  for (const [campo, { min, max }] of Object.entries(ENTEROS)) {
    const valor = cuerpo[campo];
    if (valor === undefined) continue;
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) {
      throw new ErrorHttp(400, `"${campo}" debe ser un entero entre ${min} y ${max}`);
    }
    datos[campo] = valor;
  }

  for (const campo of ENUMERADOS) {
    if (cuerpo[campo] !== undefined) datos[campo] = cuerpo[campo]; // Prisma valida los valores
  }

  for (const campo of BOOLEANOS) {
    const valor = cuerpo[campo];
    if (valor === undefined) continue;
    if (typeof valor !== 'boolean') throw new ErrorHttp(400, `"${campo}" debe ser verdadero o falso`);
    datos[campo] = valor;
  }

  if (cuerpo.intereses !== undefined) {
    const lista = cuerpo.intereses;
    if (!Array.isArray(lista) || lista.length > 12 || lista.some((i) => typeof i !== 'string' || i.length > 30)) {
      throw new ErrorHttp(400, '"intereses" debe ser una lista de hasta 12 textos cortos');
    }
    datos.intereses = lista;
  }

  return datos;
}

usuariosRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const datos = validarPerfil((req.body ?? {}) as Record<string, unknown>);
    const usuario = await prisma.user.update({ where: { id: req.params.id }, data: datos });
    return res.json(usuario);
  }),
);

/**
 * Candidatos a compañero: todos los buscadores de vivienda que el usuario
 * todavía no ha votado, ordenados por compatibilidad de mayor a menor.
 */
usuariosRouter.get(
  '/:id/candidatos',
  asyncHandler(async (req, res) => {
    const yo = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!yo) throw new ErrorHttp(404, 'Usuario no encontrado');

    const yaVotados = await prisma.swipe.findMany({
      where: { autorId: yo.id },
      select: { objetivoId: true },
    });

    const candidatos = await prisma.user.findMany({
      where: {
        role: 'ROOMMATE_SEEKER',
        id: { notIn: [yo.id, ...yaVotados.map((s) => s.objetivoId)] },
      },
    });

    const conPuntaje = candidatos
      .map((candidato) => ({
        ...candidato,
        compatibilidad: calcularCompatibilidad(yo, candidato),
      }))
      .sort((a, b) => b.compatibilidad.porcentaje - a.compatibilidad.porcentaje);

    return res.json(conPuntaje);
  }),
);
