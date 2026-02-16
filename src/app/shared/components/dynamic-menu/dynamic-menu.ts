import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../services/menu.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-dynamic-menu',
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <!-- Logo -->
            <div class="flex-shrink-0 flex items-center">
              <a routerLink="/dashboard" class="text-xl font-bold text-gray-900"> Tecmeing </a>
            </div>

            <!-- Menu Items -->
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <ng-container *ngIf="hasAnyPermission(); else noPermissions">
                <ng-container *ngFor="let item of filteredMenuItems()">
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="border-blue-500 text-gray-900"
                    [routerLinkActiveOptions]="{ exact: false }"
                    class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors duration-200"
                  >
                    <i [class]="item.icon" class="mr-2"></i>
                    {{ item.label }}
                  </a>
                </ng-container>
              </ng-container>
              <ng-template #noPermissions>
                <span class="text-sm text-gray-500 italic">Sin permisos de acceso</span>
              </ng-template>
            </div>
          </div>

          <!-- Mobile menu button -->
          <div class="sm:hidden flex items-center">
            <button
              type="button"
              (click)="toggleMobileMenu()"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              [attr.aria-expanded]="mobileMenuOpen()"
            >
              <span class="sr-only">Abrir menú principal</span>
              <i class="pi pi-bars" *ngIf="!mobileMenuOpen()"></i>
              <i class="pi pi-times" *ngIf="mobileMenuOpen()"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div class="sm:hidden" *ngIf="mobileMenuOpen()">
        <div class="pt-2 pb-3 space-y-1">
          <ng-container *ngIf="hasAnyPermission(); else noPermissionsMobile">
            <ng-container *ngFor="let item of filteredMenuItems()">
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-blue-50 border-blue-500 text-blue-700"
                [routerLinkActiveOptions]="{ exact: false }"
                (click)="closeMobileMenu()"
                class="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200"
              >
                <i [class]="item.icon" class="mr-2"></i>
                {{ item.label }}
              </a>
            </ng-container>
          </ng-container>
          <ng-template #noPermissionsMobile>
            <div class="pl-3 pr-4 py-2 text-base text-gray-500 italic">Sin permisos de acceso</div>
          </ng-template>
        </div>
      </div>
    </nav>
  `,
})
export class DynamicMenuComponent implements OnInit {
  private readonly menuService = inject(MenuService);

  // Signal para controlar el menú móvil
  mobileMenuOpen = signal(false);

  // Menú estático con las rutas principales
  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/dashboard' },
    { label: 'Proyectos', icon: 'pi pi-folder', route: '/projects' },
    { label: 'Clientes', icon: 'pi pi-users', route: '/clients' },
    { label: 'Cotizaciones', icon: 'pi pi-file', route: '/quotes' },
    { label: 'Órdenes', icon: 'pi pi-shopping-cart', route: '/orders' },
    { label: 'Requerimientos', icon: 'pi pi-list', route: '/requirements' },
    { label: 'Tareas', icon: 'pi pi-check-circle', route: '/tasks' },
    { label: 'TDRs', icon: 'pi pi-book', route: '/tdrs' },
    { label: 'Usuarios', icon: 'pi pi-user', route: '/users' },
    { label: 'Reportes', icon: 'pi pi-calendar', route: '/daily-reports' },
    { label: 'Permisos', icon: 'pi pi-shield', route: '/menu-permissions' },
    { label: 'Planes de Acción', icon: 'pi pi-bolt', route: '/fi' },
  ];

  // Computed para filtrar elementos del menú basado en permisos
  filteredMenuItems = computed(() => {
    const filtered = this.menuItems.filter((item) => this.menuService.canAccess(item.route));
    console.log('Filtered menu items:', filtered);
    return filtered;
  });

  // Computed para verificar si el usuario tiene algún permiso
  hasAnyPermission = computed(() => {
    return this.filteredMenuItems().length > 0;
  });

  ngOnInit() {
    // Inicializar el servicio de menú
    this.menuService.initialize();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
