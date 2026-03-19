import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MenuConfigService, HubSection, HubSectionItem } from '../../shared/services/menu-config.service';
import { MenuService } from '../../shared/services/menu.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-menu-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './menu-hub.html',
  styleUrl: './menu-hub.scss',
})
export class MenuHubPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private menuConfig = inject(MenuConfigService);
  private menuService = inject(MenuService);

  section = signal<HubSection | null>(null);
  filteredItems = signal<HubSectionItem[]>([]);
  notFound = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const key = params.get('section') ?? '';
      const found = this.menuConfig.getHubSection(key);
      if (!found) {
        this.notFound.set(true);
        return;
      }
      this.section.set(found);
      // Filter items by permissions
      const allowed = found.items.filter(item =>
        this.menuService.canAccess(item.routerLink)
      );
      this.filteredItems.set(allowed);
      // If no items accessible, redirect to dashboard
      if (allowed.length === 0) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  getHeroStyle(section: HubSection): Record<string, string> {
    return {
      background: `linear-gradient(135deg, ${section.colorFrom} 0%, ${section.colorTo} 100%)`,
    };
  }

  getIconCircleStyle(section: HubSection): Record<string, string> {
    return {
      backgroundColor: section.colorLight,
      color: section.colorPrimary,
    };
  }

  getCardIconStyle(section: HubSection): Record<string, string> {
    return {
      backgroundColor: section.colorLight,
      color: section.colorPrimary,
    };
  }

  getBorderHoverColor(section: HubSection): string {
    return section.colorPrimary;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  isCurrentRoute(routerLink: string): boolean {
    return this.router.url === routerLink || this.router.url.startsWith(routerLink + '/');
  }
}
