import { Categoria } from '../../../classes/categoria';

const ICONO_POR_DEFECTO = 'pi-video';

const ICONOS_POR_CATEGORIA: Record<string, string> = {
  accion: 'pi-bolt',
  comedia: 'pi-face-smile',
  drama: 'pi-comment',
  romance: 'pi-heart-fill',
  terror: 'pi-moon',
  'ciencia ficcion': 'pi-globe',
  fantasia: 'pi-star',
  animacion: 'pi-palette',
  aventura: 'pi-compass',
  suspenso: 'pi-eye',
  thriller: 'pi-eye',
  documental: 'pi-book',
  musical: 'pi-microphone',
  infantil: 'pi-users',
  familiar: 'pi-users',
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Devuelve el ícono PrimeIcons asociado a la primera categoría de la película que coincida. */
export function obtenerIconoCategoria(categorias: Categoria[]): string {
  for (const categoria of categorias) {
    const icono = ICONOS_POR_CATEGORIA[normalizar(categoria.nombre)];
    if (icono) return icono;
  }
  return ICONO_POR_DEFECTO;
}
