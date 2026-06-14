
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-navigation-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navigation-sidebar.html',
  styleUrl: './navigation-sidebar.css',
})
export class NavigationSidebarComponent {
  @Input() collapsed: boolean = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  toggleSidebar(): void {
    this.collapsedChange.emit(!this.collapsed);
  }

  mainItems = [
    {
      label: 'dashboard.sidebar.dashboard',
      route: '/dashboard',
      iconPath: '/assets/icons/dashboard/grid-outline.svg',
    },
    {
      label: 'dashboard.sidebar.my-plots',
      route: '/plots',
      iconPath: '/assets/icons/dashboard/file-tray-stacked-outline.svg',
    },
    {
      label: 'dashboard.sidebar.iot-devices',
      route: '/agronomic/iot-devices',
      iconPath: '/assets/icons/dashboard/construct-outline.svg',
    },
    {
      label: 'dashboard.sidebar.alerts',
      route: '/alerts',
      iconPath: '/assets/icons/dashboard/megaphone-outline.svg',
    },
    {
      label: 'dashboard.sidebar.dynamic-nutrition',
      route: '/dynamic-nutrition',
      iconPath: '/assets/icons/dashboard/leaf-outline.svg',
    },
    {
      label: 'dashboard.sidebar.pest-surveillance',
      route: '/pest-surveillance',
      iconPath: '/assets/icons/dashboard/bug-outline.svg',
    },
    {
      label: 'dashboard.sidebar.expert-assistance',
      route: '/expert-assistance',
      iconPath: '/assets/icons/dashboard/people-outline.svg',
    },
    {
      label: 'dashboard.sidebar.expense-history',
      route: '/expense-history',
      iconPath: '/assets/icons/dashboard/sync-outline.svg',
    },
  ];

  secondaryItems = [
    {
      label: 'dashboard.sidebar.settings',
      route: '/settings',
      iconPath: '/assets/icons/dashboard/settings-outline.svg',
    },
    {
      label: 'dashboard.sidebar.subscription',
      route: '/subscription',
      iconPath: '/assets/icons/dashboard/diamond-outline.svg',
    },
    {
      label: 'dashboard.sidebar.support',
      route: '/support',
      iconPath: '/assets/icons/dashboard/information-circle-outline.svg',
    },
  ];

  getIconStyle(path: string): { [key: string]: string } {
    return {
      '--icon-url': `url("${path}")`,
    };
  }

  isRouteActive(targetPath: string): boolean {
    return this.router.url === targetPath;
  }
}
