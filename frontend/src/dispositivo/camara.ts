/* ============================================================================
   Cámara (getUserMedia).

   Este módulo solo habla con el navegador: no sabe nada de React.

   Un flujo de video ABIERTO es una responsabilidad distinta a una foto suelta:
   mientras está abierto gasta batería, mantiene encendido el LED de la cámara y
   le dice al usuario "esta app te está grabando". Por eso quien lo abre tiene
   que apagarlo (detenerCamara) apenas deja de usarlo.

   Solo funciona en contexto seguro (HTTPS o localhost) y, además, el usuario
   tiene que dar permiso.
   ========================================================================== */

/**
 * Abre la cámara y la muestra en un <video>.
 *
 * `facingMode: { ideal: 'user' }` pide la cámara frontal (es una selfie); con
 * `ideal`, si el dispositivo no tiene frontal, el navegador entrega la que haya
 * en vez de fallar (con `exact` fallaría).
 */
export async function iniciarCamara(video: HTMLVideoElement): Promise<MediaStream> {
  // En una página servida por http:// (que no sea localhost) el navegador ni
  // siquiera define navigator.mediaDevices: es undefined, no un error de permisos.
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new TypeError('navigator.mediaDevices no está disponible');
  }

  const flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false, // solo se muestra imagen: nunca se pide el micrófono
  });

  try {
    video.srcObject = flujo;
    await video.play();
  } catch (error) {
    // La cámara ya se abrió pero el video no pudo reproducirla. Quien llamó
    // nunca recibirá el flujo, así que nadie más podría apagarlo: se apaga aquí,
    // o la cámara quedaría encendida sin que la app lo supiera.
    detenerCamara(video, flujo);
    throw error;
  }
  return flujo;
}

/** Apaga la cámara de verdad: parar las pistas es lo que apaga el LED. */
export function detenerCamara(video: HTMLVideoElement | null, flujo: MediaStream | null): void {
  flujo?.getTracks().forEach((pista) => pista.stop());
  if (video) video.srcObject = null;
}

/**
 * Traduce el error de getUserMedia a algo que el usuario entienda. Cada nombre
 * significa algo distinto y la reacción correcta también es distinta.
 */
export function describirErrorCamara(error: unknown): string {
  const nombre = error instanceof Error ? error.name : '';

  switch (nombre) {
    case 'NotAllowedError':
      return 'Bloqueaste el permiso de cámara. Puedes seguir usando tu emoji como foto; si cambias de idea, permite la cámara desde el candado del navegador.';
    case 'NotFoundError':
      return 'No encontramos ninguna cámara en este dispositivo.';
    case 'NotReadableError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    case 'SecurityError':
      // No significa "falta HTTPS": significa que el navegador tiene desactivado
      // el acceso a los medios en este documento.
      return 'El navegador tiene bloqueado el acceso a la cámara en esta página.';
    case 'TypeError':
      // Aquí sí es la falta de HTTPS: sin contexto seguro, mediaDevices no existe.
      return window.isSecureContext
        ? 'Este navegador no permite usar la cámara.'
        : 'La cámara solo funciona en una conexión segura (HTTPS o localhost).';
    default:
      return 'No se pudo iniciar la cámara. Inténtalo de nuevo.';
  }
}

/**
 * Congela el fotograma actual del video como una imagen JPEG cuadrada.
 *
 * Se recorta el cuadrado central (la foto de perfil es cuadrada) y se reduce a
 * `ladoMax` píxeles: una foto de 1280×720 pesaría cientos de KB y para un
 * avatar no hace falta. Se invierte horizontalmente para que la foto quede
 * igual que la vista previa en espejo que vio el usuario.
 */
export function capturarFoto(video: HTMLVideoElement, ladoMax = 480, calidad = 0.85): Promise<Blob> {
  const ancho = video.videoWidth;
  const alto = video.videoHeight;
  if (!ancho || !alto) return Promise.reject(new Error('La cámara todavía no tiene imagen'));

  const lado = Math.min(ancho, alto);
  const salida = Math.min(lado, ladoMax);

  const lienzo = document.createElement('canvas');
  lienzo.width = salida;
  lienzo.height = salida;

  const ctx = lienzo.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No se pudo preparar la imagen'));

  ctx.translate(salida, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, (ancho - lado) / 2, (alto - lado) / 2, lado, lado, 0, 0, salida, salida);

  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo crear la imagen'))),
      'image/jpeg',
      calidad,
    );
  });
}
