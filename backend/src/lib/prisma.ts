import { PrismaClient } from '@prisma/client';

/**
 * Una sola instancia de PrismaClient para toda la app. Crear una por petición
 * abriría un pool de conexiones nuevo cada vez y agotaría la base de datos.
 */
export const prisma = new PrismaClient();
