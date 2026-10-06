import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface ItemSidebar {
  etiqueta: string;
  icono: string;
  ruta: string | null;
}

const ITEMS_SIDEBAR: ItemSidebar[] = [
  { etiqueta: 'Dashboard', icono: 'pi pi-home', ruta: '/backoffice/dashboard' },
  { etiqueta: 'Películas', icono: 'pi pi-video', ruta: '/backoffice/peliculas' },
  { etiqueta: 'Funciones', icono: 'pi pi-calendar', ruta: '/backoffice/funciones' },
  { etiqueta: 'Artículos', icono: 'pi pi-shopping-bag', ruta: '/backoffice/articulos' },
  { etiqueta: 'Combos', icono: 'pi pi-gift', ruta: '/backoffice/combos' },
  { etiqueta: 'Facturaciones', icono: 'pi pi-receipt', ruta: '/backoffice/facturaciones' },
  { etiqueta: 'Auditorías', icono: 'pi pi-shield', ruta: '/backoffice/auditorias' },
  { etiqueta: 'Configuración', icono: 'pi pi-cog', ruta: '/backoffice/configuracion' },
];

@Component({
  selector: 'app-sidebar-backoffice',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-backoffice.html',
})
export class SidebarBackoffice {
  protected readonly items = ITEMS_SIDEBAR;
}
