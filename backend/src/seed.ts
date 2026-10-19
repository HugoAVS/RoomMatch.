import 'dotenv/config';
import { prisma } from './lib/prisma';

/* ============================================================================
   Datos de prueba de RoomMatch.

   Detalle pensado para la demostración: tres candidatos ya le dieron LIKE al
   usuario demo. Así, al aceptarlos en la pantalla "Descubrir", el match se
   forma en vivo y se puede mostrar la animación.
   ========================================================================== */

const buscadores = [
  {
    email: 'demo@roommatch.co',
    fullName: 'Juan Esteban',
    avatar: '🧑‍💻',
    edad: 22,
    ciudad: 'Tunja',
    ocupacion: 'Estudiante de Ingeniería de Sistemas',
    bio: 'Busco apartamento cerca a la UPTC. Tranquilo entre semana, me gusta cocinar los domingos.',
    presupuesto: 650000,
    horario: 'NOCTURNO' as const,
    orden: 'NORMAL' as const,
    sociabilidad: 'EQUILIBRADO' as const,
    fumador: false,
    mascotas: true,
    intereses: ['Programación', 'Ciclismo', 'Cine'],
  },
  {
    email: 'laura.gomez@roommatch.co',
    fullName: 'Laura Gómez',
    avatar: '👩‍🎨',
    edad: 23,
    ciudad: 'Tunja',
    ocupacion: 'Estudiante de Diseño Gráfico',
    bio: 'Ordenada, con una gata muy tranquila. Me gusta que el apartamento se sienta como un hogar.',
    presupuesto: 700000,
    horario: 'NOCTURNO' as const,
    orden: 'MUY_ORDENADO' as const,
    sociabilidad: 'EQUILIBRADO' as const,
    fumador: false,
    mascotas: true,
    intereses: ['Cine', 'Fotografía', 'Café'],
  },
  {
    email: 'andres.ruiz@roommatch.co',
    fullName: 'Andrés Ruiz',
    avatar: '🧑‍🔬',
    edad: 24,
    ciudad: 'Tunja',
    ocupacion: 'Estudiante de Maestría en Química',
    bio: 'Paso mucho tiempo en el laboratorio. Busco un lugar silencioso para estudiar.',
    presupuesto: 620000,
    horario: 'NOCTURNO' as const,
    orden: 'NORMAL' as const,
    sociabilidad: 'CASERO' as const,
    fumador: false,
    mascotas: true,
    intereses: ['Programación', 'Ajedrez', 'Cine'],
  },
  {
    email: 'valentina.p@roommatch.co',
    fullName: 'Valentina Páez',
    avatar: '👩‍⚕️',
    edad: 25,
    ciudad: 'Tunja',
    ocupacion: 'Residente de Medicina',
    bio: 'Turnos rotativos, así que casi no estoy en casa. Muy ordenada y respetuosa con los espacios.',
    presupuesto: 900000,
    horario: 'MADRUGADOR' as const,
    orden: 'MUY_ORDENADO' as const,
    sociabilidad: 'CASERO' as const,
    fumador: false,
    mascotas: false,
    intereses: ['Running', 'Lectura'],
  },
  {
    email: 'santiago.m@roommatch.co',
    fullName: 'Santiago Martínez',
    avatar: '🧑‍🎤',
    edad: 21,
    ciudad: 'Tunja',
    ocupacion: 'Estudiante de Música',
    bio: 'Ensayo guitarra en las tardes. Me encanta recibir amigos los fines de semana.',
    presupuesto: 550000,
    horario: 'NOCTURNO' as const,
    orden: 'RELAJADO' as const,
    sociabilidad: 'SOCIAL' as const,
    fumador: true,
    mascotas: false,
    intereses: ['Música', 'Cine', 'Conciertos'],
  },
  {
    email: 'camila.t@roommatch.co',
    fullName: 'Camila Torres',
    avatar: '👩‍🏫',
    edad: 26,
    ciudad: 'Tunja',
    ocupacion: 'Docente de inglés',
    bio: 'Madrugo todos los días. Busco gente tranquila y organizada para compartir apartamento.',
    presupuesto: 680000,
    horario: 'MADRUGADOR' as const,
    orden: 'MUY_ORDENADO' as const,
    sociabilidad: 'EQUILIBRADO' as const,
    fumador: false,
    mascotas: false,
    intereses: ['Lectura', 'Yoga', 'Café'],
  },
  {
    email: 'nicolas.b@roommatch.co',
    fullName: 'Nicolás Bernal',
    avatar: '🧑‍💼',
    edad: 27,
    ciudad: 'Tunja',
    ocupacion: 'Analista de datos (remoto)',
    bio: 'Trabajo desde casa, necesito buen internet. Cocino bastante y comparto sin problema.',
    presupuesto: 750000,
    horario: 'FLEXIBLE' as const,
    orden: 'NORMAL' as const,
    sociabilidad: 'EQUILIBRADO' as const,
    fumador: false,
    mascotas: true,
    intereses: ['Programación', 'Cocina', 'Ciclismo'],
  },
  {
    email: 'daniela.r@roommatch.co',
    fullName: 'Daniela Rojas',
    avatar: '👩‍🔧',
    edad: 22,
    ciudad: 'Tunja',
    ocupacion: 'Estudiante de Ingeniería Civil',
    bio: 'Deportista, salgo a correr a las 5 a.m. Busco compañeros responsables con los gastos.',
    presupuesto: 600000,
    horario: 'MADRUGADOR' as const,
    orden: 'NORMAL' as const,
    sociabilidad: 'SOCIAL' as const,
    fumador: false,
    mascotas: false,
    intereses: ['Running', 'Ciclismo', 'Música'],
  },
  {
    email: 'felipe.c@roommatch.co',
    fullName: 'Felipe Castro',
    avatar: '🧑‍🍳',
    edad: 29,
    ciudad: 'Bogotá',
    ocupacion: 'Chef',
    bio: 'Trabajo de noche en un restaurante. Dejo la cocina impecable, es mi oficio.',
    presupuesto: 1100000,
    horario: 'NOCTURNO' as const,
    orden: 'MUY_ORDENADO' as const,
    sociabilidad: 'SOCIAL' as const,
    fumador: false,
    mascotas: false,
    intereses: ['Cocina', 'Música', 'Viajes'],
  },
  {
    email: 'mariana.l@roommatch.co',
    fullName: 'Mariana López',
    avatar: '👩‍💻',
    edad: 24,
    ciudad: 'Tunja',
    ocupacion: 'Desarrolladora frontend',
    bio: 'Programo de noche con audífonos. Tengo un perro pequeño muy juicioso.',
    presupuesto: 700000,
    horario: 'NOCTURNO' as const,
    orden: 'NORMAL' as const,
    sociabilidad: 'EQUILIBRADO' as const,
    fumador: false,
    mascotas: true,
    intereses: ['Programación', 'Cine', 'Videojuegos'],
  },
];

const arrendadores = [
  {
    email: 'propiedades.tunja@roommatch.co',
    fullName: 'Inmobiliaria Centro Tunja',
    avatar: '🏢',
    ciudad: 'Tunja',
    ocupacion: 'Arrendador',
    bio: 'Administramos apartamentos cerca de la UPTC.',
  },
  {
    email: 'rosa.arrendadora@roommatch.co',
    fullName: 'Rosa Jiménez',
    avatar: '👵',
    ciudad: 'Tunja',
    ocupacion: 'Arrendadora',
    bio: 'Arriendo habitaciones en casa familiar, ambiente tranquilo.',
  },
];

const propiedades = [
  {
    title: 'Apartaestudio amoblado cerca a la UPTC',
    description: 'Apartaestudio de 35 m², totalmente amoblado, a 6 cuadras de la universidad. Incluye servicios e internet de fibra.',
    price: 750000, city: 'Tunja', barrio: 'La María',
    habitaciones: 1, banos: 1, amoblado: true, emoji: '🏢',
    servicios: ['Internet', 'Agua', 'Luz', 'Amoblado'],
  },
  {
    title: 'Habitación en apartamento compartido',
    description: 'Habitación privada con baño compartido. Cocina y sala comunes. Ideal para estudiantes.',
    price: 420000, city: 'Tunja', barrio: 'Centro',
    habitaciones: 1, banos: 1, amoblado: true, emoji: '🛏️',
    servicios: ['Internet', 'Agua', 'Luz'],
  },
  {
    title: 'Apartamento de 2 habitaciones, Antonio Nariño',
    description: 'Apartamento amplio e iluminado, perfecto para compartir entre dos personas. Zona tranquila y segura.',
    price: 980000, city: 'Tunja', barrio: 'Antonio Nariño',
    habitaciones: 2, banos: 2, amoblado: false, emoji: '🏠',
    servicios: ['Parqueadero', 'Zona de lavandería'],
  },
  {
    title: 'Habitación en casa familiar',
    description: 'Habitación cómoda en casa de familia, con derecho a cocina. Ambiente hogareño y tranquilo.',
    price: 380000, city: 'Tunja', barrio: 'Santa Inés',
    habitaciones: 1, banos: 1, amoblado: true, emoji: '🏡',
    servicios: ['Agua', 'Luz', 'Cocina'],
  },
  {
    title: 'Apartamento 3 habitaciones para grupo',
    description: 'Ideal para tres estudiantes. Tres habitaciones, dos baños, sala amplia y cocina integral.',
    price: 1350000, city: 'Tunja', barrio: 'El Bosque',
    habitaciones: 3, banos: 2, amoblado: false, emoji: '🏘️',
    servicios: ['Parqueadero', 'Internet', 'Zona de lavandería'],
  },
  {
    title: 'Aparta-estudio moderno en Chapinero',
    description: 'Apartaestudio recién remodelado, cerca al transporte público y a varias universidades.',
    price: 1400000, city: 'Bogotá', barrio: 'Chapinero',
    habitaciones: 1, banos: 1, amoblado: true, emoji: '🌆',
    servicios: ['Internet', 'Amoblado', 'Gimnasio'],
  },
  {
    title: 'Habitación con balcón, Teusaquillo',
    description: 'Habitación amplia con balcón privado en apartamento compartido con dos personas más.',
    price: 850000, city: 'Bogotá', barrio: 'Teusaquillo',
    habitaciones: 1, banos: 1, amoblado: true, emoji: '🪴',
    servicios: ['Internet', 'Agua', 'Luz'],
  },
  {
    title: 'Apartamento económico para estudiantes',
    description: 'Apartamento sencillo de dos habitaciones, a 10 minutos caminando de la UPTC.',
    price: 700000, city: 'Tunja', barrio: 'Los Muiscas',
    habitaciones: 2, banos: 1, amoblado: false, emoji: '🧱',
    servicios: ['Agua', 'Luz'],
  },
];

/**
 * Crea los datos de demostración.
 *
 * @param limpiar true = BORRA todas las tablas antes de crear (es lo que hace
 *                `npm run seed`, para reiniciar la demo). false = solo crea,
 *                para el arranque en producción.
 */
export async function sembrar({ limpiar }: { limpiar: boolean }) {
  if (limpiar) {
    console.log('Limpiando datos anteriores...');
    await prisma.match.deleteMany();
    await prisma.swipe.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
  }

  console.log('Creando usuarios...');
  const creados = await Promise.all(
    buscadores.map((u) => prisma.user.create({ data: { ...u, role: 'ROOMMATE_SEEKER' } })),
  );
  const demo = creados[0];

  const landlords = await Promise.all(
    arrendadores.map((u) => prisma.user.create({ data: { ...u, role: 'LANDLORD' } })),
  );

  console.log('Creando propiedades...');
  await Promise.all(
    propiedades.map((p, i) =>
      prisma.property.create({
        data: { ...p, landlordId: landlords[i % landlords.length].id },
      }),
    ),
  );

  // Tres candidatos ya dieron LIKE al usuario demo: al aceptarlos durante la
  // demostración, el match se forma al instante.
  const admiradores = creados.slice(1, 4);
  console.log('Creando likes previos hacia el usuario demo...');
  await Promise.all(
    admiradores.map((a) =>
      prisma.swipe.create({
        data: { autorId: a.id, objetivoId: demo.id, decision: 'LIKE' },
      }),
    ),
  );

  console.log('\nListo:');
  console.log(`  ${creados.length} buscadores de vivienda`);
  console.log(`  ${landlords.length} arrendadores`);
  console.log(`  ${propiedades.length} propiedades`);
  console.log(`  ${admiradores.length} likes esperando al usuario demo`);
  console.log(`\n  Usuario demo: ${demo.fullName} <${demo.email}>`);
  console.log(`  Ya le dieron like: ${admiradores.map((a) => a.fullName).join(', ')}`);
}

/**
 * Siembra SOLO si la base de datos está vacía. Es seguro llamarla en cada
 * arranque: si ya hay usuarios, no toca nada. Devuelve true si sembró.
 */
export async function sembrarSiVacia(): Promise<boolean> {
  if ((await prisma.user.count()) > 0) return false;
  await sembrar({ limpiar: false });
  return true;
}

// `npm run seed` ejecuta este archivo directamente. Al importarlo desde
// index.ts NO se ejecuta nada: solo se exponen las funciones de arriba.
if (require.main === module) {
  sembrar({ limpiar: true })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
