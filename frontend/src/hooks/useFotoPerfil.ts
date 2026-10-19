import { useCallback, useEffect, useRef, useState } from 'react';
import { borrarFotoPerfil, guardarFotoPerfil, leerFotoPerfil } from '../almacenamiento/foto';

/**
 * La foto de perfil guardada en este dispositivo, lista para usar en un <img>.
 *
 * Un Blob no se puede poner directo en `src`: se le crea una URL temporal con
 * URL.createObjectURL, y hay que liberarla (revokeObjectURL) cuando ya no se
 * usa o la imagen se queda ocupando memoria hasta cerrar la pestaña.
 */
export function useFotoPerfil() {
  const [url, setUrl] = useState<string | null>(null);
  const [tomadaEn, setTomadaEn] = useState<number | null>(null);
  const urlActual = useRef<string | null>(null);

  const mostrar = useCallback((imagen: Blob | null, cuando: number | null) => {
    if (urlActual.current) URL.revokeObjectURL(urlActual.current);
    urlActual.current = imagen ? URL.createObjectURL(imagen) : null;
    setUrl(urlActual.current);
    setTomadaEn(cuando);
  }, []);

  useEffect(() => {
    leerFotoPerfil()
      .then((foto) => mostrar(foto?.imagen ?? null, foto?.tomadaEn ?? null))
      .catch(() => mostrar(null, null)); // IndexedDB no disponible: se ve el emoji

    return () => {
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
      urlActual.current = null;
    };
  }, [mostrar]);

  const guardar = useCallback(
    async (imagen: Blob) => {
      await guardarFotoPerfil(imagen);
      mostrar(imagen, Date.now());
    },
    [mostrar],
  );

  const quitar = useCallback(async () => {
    await borrarFotoPerfil();
    mostrar(null, null);
  }, [mostrar]);

  return { url, tomadaEn, guardar, quitar };
}
