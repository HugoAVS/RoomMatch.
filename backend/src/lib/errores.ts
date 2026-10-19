import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';

/* ============================================================================
   Manejo de errores del backend.

   Dos problemas que esto resuelve:

   1. Express 4 NO atrapa los errores de las funciones `async`. Si una consulta a
      la base de datos fallaba dentro de un manejador, la promesa rechazada nadie
      la manejaba y Node terminaba TODO el proceso. Cualquier microcorte de la
      base de datos (o una URL como ?maxPrecio=abc) tumbaba el servidor entero.
      `asyncHandler` envía esos errores al middleware de errores.

   2. Los errores de Prisma traen rutas del disco del servidor y fragmentos de
      SQL. Mandárselos al cliente filtra información interna. `traducirError`
      los convierte en un mensaje seguro y un código HTTP adecuado.
   ========================================================================== */

/** Un error que ya sabemos explicar al cliente (validación, no encontrado...). */
export class ErrorHttp extends Error {
  readonly estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorHttp';
    this.estado = estado;
  }
}

type ManejadorAsync = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Envuelve un manejador async para que sus errores lleguen al middleware de errores. */
export function asyncHandler(manejador: ManejadorAsync): RequestHandler {
  return (req, res, next) => {
    manejador(req, res, next).catch(next);
  };
}

export interface ErrorTraducido {
  estado: number;
  mensaje: string;
  /** true = es un fallo nuestro o de la infraestructura: conviene dejarlo en el log. */
  registrar: boolean;
}

// Códigos de Prisma que significan "no se pudo hablar con la base de datos".
const CODIGOS_SIN_BASE_DE_DATOS = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

export function traducirError(error: unknown): ErrorTraducido {
  if (error instanceof ErrorHttp) {
    return { estado: error.estado, mensaje: error.message, registrar: false };
  }

  // Errores de body-parser: JSON mal formado o cuerpo demasiado grande.
  const tipo = (error as { type?: string } | null)?.type;
  if (tipo === 'entity.parse.failed') {
    return { estado: 400, mensaje: 'El cuerpo de la petición no es un JSON válido', registrar: false };
  }
  if (tipo === 'entity.too.large') {
    return { estado: 413, mensaje: 'La petición es demasiado grande', registrar: false };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { estado: 503, mensaje: 'La base de datos no está disponible. Inténtalo en un momento.', registrar: true };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (CODIGOS_SIN_BASE_DE_DATOS.has(error.code)) {
      return { estado: 503, mensaje: 'La base de datos no está disponible. Inténtalo en un momento.', registrar: true };
    }
    switch (error.code) {
      case 'P2003': // llave foránea: el usuario al que se hace referencia no existe
        return { estado: 400, mensaje: 'Uno de los usuarios indicados no existe', registrar: false };
      case 'P2025': // update/delete de algo que no existe
        return { estado: 404, mensaje: 'No se encontró lo que se pedía', registrar: false };
      case 'P2002': // violación de unicidad
        return { estado: 409, mensaje: 'Ese registro ya existe', registrar: false };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return { estado: 400, mensaje: 'Los datos enviados no son válidos', registrar: false };
  }

  return { estado: 500, mensaje: 'Error interno del servidor', registrar: true };
}
