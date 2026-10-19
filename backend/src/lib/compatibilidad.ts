import type { User } from '@prisma/client';

/* ============================================================================
   Cálculo de compatibilidad entre dos posibles compañeros de vivienda.

   Devuelve un porcentaje de 0 a 100 repartido en seis factores. La idea es que
   el puntaje sea explicable: cada factor aporta un máximo conocido, así la app
   puede mostrar "coinciden en horario y presupuesto" y no solo un número.
   ========================================================================== */

const PESOS = {
  presupuesto: 30,
  horario: 20,
  orden: 20,
  sociabilidad: 15,
  fumador: 10,
  mascotas: 5,
} as const;

/** Qué tan parecidos son dos presupuestos: 1 si son iguales, 0 si se alejan 50% o más. */
function afinidadPresupuesto(a: number, b: number): number {
  const mayor = Math.max(a, b);
  if (mayor === 0) return 1;
  const diferenciaRelativa = Math.abs(a - b) / mayor;
  return Math.max(0, 1 - diferenciaRelativa / 0.5);
}

/** Dos horarios iguales encajan; "FLEXIBLE" encaja a medias con cualquiera. */
function afinidadHorario(a: string, b: string): number {
  if (a === b) return 1;
  if (a === 'FLEXIBLE' || b === 'FLEXIBLE') return 0.6;
  return 0; // MADRUGADOR vs NOCTURNO
}

/** Distancia en una escala ordinal de 3 niveles (0 = iguales, 1 = opuestos). */
function afinidadEscala(a: string, b: string, escala: readonly string[]): number {
  const distancia = Math.abs(escala.indexOf(a) - escala.indexOf(b));
  return 1 - distancia / (escala.length - 1);
}

const ESCALA_ORDEN = ['RELAJADO', 'NORMAL', 'MUY_ORDENADO'] as const;
const ESCALA_SOCIAL = ['CASERO', 'EQUILIBRADO', 'SOCIAL'] as const;

export interface ResultadoCompatibilidad {
  porcentaje: number;
  coincidencias: string[];
  diferencias: string[];
}

export function calcularCompatibilidad(a: User, b: User): ResultadoCompatibilidad {
  const factores = [
    {
      nombre: 'Presupuesto parecido',
      contrario: 'Presupuestos distintos',
      valor: afinidadPresupuesto(a.presupuesto, b.presupuesto),
      peso: PESOS.presupuesto,
    },
    {
      nombre: 'Horarios compatibles',
      contrario: 'Horarios opuestos',
      valor: afinidadHorario(a.horario, b.horario),
      peso: PESOS.horario,
    },
    {
      nombre: 'Mismo nivel de orden',
      contrario: 'Distinto nivel de orden',
      valor: afinidadEscala(a.orden, b.orden, ESCALA_ORDEN),
      peso: PESOS.orden,
    },
    {
      nombre: 'Vida social parecida',
      contrario: 'Vida social distinta',
      valor: afinidadEscala(a.sociabilidad, b.sociabilidad, ESCALA_SOCIAL),
      peso: PESOS.sociabilidad,
    },
    {
      nombre: a.fumador ? 'Ambos fuman' : 'Ninguno fuma',
      contrario: 'No coinciden con el cigarrillo',
      valor: a.fumador === b.fumador ? 1 : 0,
      peso: PESOS.fumador,
    },
    {
      nombre: a.mascotas ? 'Ambos aceptan mascotas' : 'Ninguno tiene mascotas',
      contrario: 'No coinciden con las mascotas',
      valor: a.mascotas === b.mascotas ? 1 : 0,
      peso: PESOS.mascotas,
    },
  ];

  const puntaje = factores.reduce((suma, f) => suma + f.valor * f.peso, 0);

  // Los intereses en común suman hasta 8 puntos extra, sin pasar de 100.
  const comunes = a.intereses.filter((i) => b.intereses.includes(i));
  const bono = Math.min(comunes.length * 3, 8);

  return {
    porcentaje: Math.min(100, Math.round(puntaje + bono)),
    coincidencias: [
      ...factores.filter((f) => f.valor >= 0.7).map((f) => f.nombre),
      ...comunes.map((i) => `Les gusta ${i.toLowerCase()}`),
    ],
    diferencias: factores.filter((f) => f.valor < 0.4).map((f) => f.contrario),
  };
}
