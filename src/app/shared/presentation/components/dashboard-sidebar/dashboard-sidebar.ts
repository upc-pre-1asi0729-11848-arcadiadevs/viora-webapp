import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSessionService } from '../../../infrastructure/active-session.service';

interface SidebarItem {
  labelKey: string;
  route: string;
  iconPath?: string;
  icon?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, TranslatePipe],
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.css',
})
export class DashboardSidebar {
  private readonly session = inject(ActiveSessionService);
  private readonly router = inject(Router);

  protected readonly collapsed = signal<boolean>(false);

  /** Signed-in identity for the footer (name, else email, else a fallback). */
  protected readonly displayName = computed<string>(() => {
    const current = this.session.session();
    return current?.fullName?.trim() || current?.email || 'Viora user';
  });

  /** The signed-in user's avatar, or the packaged generic photo. */
  protected readonly avatarUrl = computed<string>(
    () => this.session.session()?.photoUrl?.trim() || '/assets/images/dashboard/generic-user.jpg',
  );

  protected readonly mainItems: SidebarItem[] = [
    {
      labelKey: 'sidebar.dashboard',
      route: '/dashboard',
      iconPath: '/assets/icons/dashboard/grid-outline.svg',
      exact: true,
    },
    {
      labelKey: 'sidebar.myPlots',
      route: '/agronomic/plots',
      iconPath: '/assets/icons/dashboard/file-tray-stacked-outline.svg',
    },
    {
      labelKey: 'sidebar.iotDevices',
      route: '/agronomic/iot-devices',
      icon: 'memory',
    },
    {
      labelKey: 'sidebar.alerts',
      route: '/surveillance/alerts',
      iconPath: '/assets/icons/dashboard/megaphone-outline.svg',
    },
    {
      labelKey: 'sidebar.dynamicNutrition',
      route: '/agronomic/dynamic-nutrition',
      iconPath: '/assets/icons/dashboard/leaf-outline.svg',
    },
    {
      labelKey: 'sidebar.pestSurveillance',
      route: '/surveillance/pest-surveillance',
      iconPath: '/assets/icons/dashboard/bug-outline.svg',
    },
    {
      labelKey: 'sidebar.expertAssistance',
      route: '/assistance/expert-assistance',
      iconPath: '/assets/icons/dashboard/people-outline.svg',
    },
    {
      labelKey: 'sidebar.expenseHistory',
      route: '/agronomic/expense-history',
      iconPath: '/assets/icons/dashboard/sync-outline.svg',
    },
    {
      labelKey: 'sidebar.interventions',
      route: '/assistance/interventions',
      iconPath: '/assets/icons/dashboard/construct-outline.svg',
    },
  ];

  protected readonly secondaryItems: SidebarItem[] = [
    {
      labelKey: 'sidebar.settings',
      route: '/settings',
      iconPath: '/assets/icons/dashboard/settings-outline.svg',
    },
    {
      labelKey: 'sidebar.subscription',
      route: '/billing/subscription',
      iconPath: '/assets/icons/dashboard/diamond-outline.svg',
    },
    {
      labelKey: 'sidebar.support',
      route: '/support',
      iconPath: '/assets/icons/dashboard/information-circle-outline.svg',
    },
  ];

  protected toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  protected getIconMask(iconPath: string): string {
    return `url("${iconPath}")`;
  }

  /** Ends the session and returns to the login screen. */
  protected logout(): void {
    this.session.clear();
    this.router.navigate(['/login']);
  }
}
