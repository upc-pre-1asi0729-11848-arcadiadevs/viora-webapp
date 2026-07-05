import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSessionService } from '../../../infrastructure/active-session.service';
import { ProfileStore } from '../../../../profile/application/profile.store';

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
  private readonly profile = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly collapsed = signal<boolean>(false);

  constructor() {
    // The sidebar mounts once per authenticated session (it lives in the layout
    // shell). Sign-in doesn't return the avatar, so hydrate it from the profile
    // when the session has none yet — this restores the toolbar photo after a
    // fresh login without the user having to open Settings.
    if (this.session.session() && !this.session.session()?.photoUrl) {
      this.profile.load();
    }
  }

  /** Signed-in identity for the footer (name, else email, else a fallback). */
  protected readonly displayName = computed<string>(() => {
    const current = this.session.session();
    return current?.fullName?.trim() || current?.email || 'Viora user';
  });

  /** The signed-in user's avatar, or the packaged generic photo. */
  protected readonly avatarUrl = computed<string>(
    () => this.session.session()?.photoUrl?.trim() || '/assets/images/dashboard/generic-user.jpg',
  );

  /** Primary navigation for the grower (producer) segment. */
  private readonly growerItems: SidebarItem[] = [
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

  /**
   * Primary navigation for the specialist segment. Distinct workspace: the
   * specialist reviews incoming producer requests and manages field
   * interventions rather than tending their own plots (My Portfolio is
   * intentionally deferred).
   */
  private readonly specialistItems: SidebarItem[] = [
    {
      labelKey: 'sidebar.dashboard',
      route: '/dashboard',
      iconPath: '/assets/icons/dashboard/grid-outline.svg',
      exact: true,
    },
    {
      labelKey: 'sidebar.interventionMarketplace',
      route: '/specialist/marketplace',
      icon: 'storefront',
    },
    {
      labelKey: 'sidebar.myRequests',
      route: '/specialist/requests',
      icon: 'inbox',
    },
    {
      labelKey: 'sidebar.fieldInspection',
      route: '/specialist/field-inspection',
      icon: 'center_focus_weak',
    },
    {
      labelKey: 'sidebar.myProfile',
      route: '/settings',
      icon: 'person',
    },
  ];

  /** Primary navigation, chosen by the signed-in user's segment. */
  protected readonly mainItems = computed<SidebarItem[]>(() =>
    this.session.isSpecialist() ? this.specialistItems : this.growerItems,
  );

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
