export type Horario = 'MADRUGADOR' | 'NOCTURNO' | 'FLEXIBLE';
export type NivelOrden = 'RELAJADO' | 'NORMAL' | 'MUY_ORDENADO';
export type Sociabilidad = 'CASERO' | 'EQUILIBRADO' | 'SOCIAL';
export type Decision = 'LIKE' | 'PASS';

export interface Usuario {
  id: string;
  email: string;
  fullName: string;
  role: 'ROOMMATE_SEEKER' | 'LANDLORD';
  edad: number;
  ciudad: string;
  bio: string;
  ocupacion: string;
  avatar: string;
  presupuesto: number;
  horario: Horario;
  orden: NivelOrden;
  sociabilidad: Sociabilidad;
  fumador: boolean;
  mascotas: boolean;
  intereses: string[];
}

export interface Compatibilidad {
  porcentaje: number;
  coincidencias: string[];
  diferencias: string[];
}

export interface Candidato extends Usuario {
  compatibilidad: Compatibilidad;
}

export interface Match {
  id: string;
  createdAt: string;
  compañero: Usuario;
  compatibilidad: Compatibilidad;
}

export interface Propiedad {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  barrio: string;
  habitaciones: number;
  banos: number;
  amoblado: boolean;
  servicios: string[];
  emoji: string;
  landlord: { id: string; fullName: string; avatar: string };
}

export const ETIQUETAS = {
  horario: {
    MADRUGADOR: 'Madrugador',
    NOCTURNO: 'Nocturno',
    FLEXIBLE: 'Horario flexible',
  },
  orden: {
    RELAJADO: 'Relajado',
    NORMAL: 'Orden normal',
    MUY_ORDENADO: 'Muy ordenado',
  },
  sociabilidad: {
    CASERO: 'Casero',
    EQUILIBRADO: 'Equilibrado',
    SOCIAL: 'Muy social',
  },
} as const;

/** 650000 -> "$650.000" */
export function formatearPrecio(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}
