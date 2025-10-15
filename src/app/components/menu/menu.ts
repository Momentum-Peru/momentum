import { Component, signal, HostListener, inject } from '@angular/core';
import { AuthService } from '../../pages/login/services/auth.service';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [Button],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu {
  private authService = inject(AuthService);

  // Estado del menú hamburguesa
  isMenuOpen = signal(false);

  // Items del menú
  menuItems = signal([
    {
      link: '/calendario',
      label: 'Calendario',
      icon: 'pi pi-calendar'
    },
    {
      link: '/telefono',
      label: 'Teléfono',
      icon: 'pi pi-phone'
    },
    {
      link: '/cuentas-email',
      label: 'Cuentas de Email',
      icon: 'pi pi-envelope'
    },
    {
      link: '/contactos',
      label: 'Contactos',
      icon: 'pi pi-users'
    }
  ]);

  /**
   * Alterna el estado del menú
   */
  toggleMenu(): void {
    this.isMenuOpen.update(value => !value);
  }

  /**
   * Cierra el menú
   */
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Escucha cambios de tamaño de pantalla para cerrar el menú en desktop
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Si la pantalla es mayor a md (768px), cerrar el menú
    if (event.target.innerWidth >= 768) {
      this.closeMenu();
    }
  }

  /**
   * Escucha la tecla Escape para cerrar el menú
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    }
  }

  /**
   * Maneja el cierre de sesión
   */
  onLogout(): void {
    this.closeMenu();
    this.authService.logout();
  }
}
