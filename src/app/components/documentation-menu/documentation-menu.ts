import { Component, signal, HostListener, inject, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';

@Component({
  selector: 'app-documentation-menu',
  standalone: true,
  imports: [RouterModule, PanelMenuModule],
  templateUrl: './documentation-menu.html',
  styleUrl: './documentation-menu.scss',
})
export class DocumentationMenuComponent implements OnInit {
  private router = inject(Router);

  isMenuOpen = signal(false);
  currentRoute = signal('');

  /** Menú de documentación: Logística > Proveedores, Compras */
  menuItems = signal<MenuItem[]>([
    {
      label: 'Logística',
      icon: 'pi pi-truck',
      expanded: true,
      items: [
        {
          label: 'Proveedores',
          icon: 'pi pi-building',
          routerLink: '/docs/logistica/proveedores',
          routerLinkActiveOptions: { exact: false },
        },
        {
          label: 'Compras',
          icon: 'pi pi-shopping-cart',
          routerLink: '/docs/logistica/compras',
          routerLinkActiveOptions: { exact: false },
        },
      ],
    },
  ]);

  ngOnInit(): void {
    const initialUrl = this.router.url.split('?')[0];
    this.currentRoute.set(initialUrl);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.url.split('?')[0]);
        this.closeMenu();
      });
  }

  isActiveRoute(route: string): boolean {
    if (!route) return false;
    const current = this.currentRoute();
    const normalized = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
    const normalizedCurrent =
      current.endsWith('/') && current !== '/' ? current.slice(0, -1) : current;
    if (normalizedCurrent === normalized) return true;
    if (normalized !== '/' && normalized !== '') {
      return normalizedCurrent.startsWith(normalized + '/') || normalizedCurrent === normalized;
    }
    return false;
  }

  toggleMenu(): void {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const target = event.target as Window;
    if (target.innerWidth >= 768) this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMenuOpen()) this.closeMenu();
  }
}
