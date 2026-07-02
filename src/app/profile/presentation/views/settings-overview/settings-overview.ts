import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';

import { ProfileStore } from '../../../application/profile.store';
import { UserProfile } from '../../../domain/model/user-profile.entity';

/** Settings sections. Referrals and Security are wired once their mockups land. */
type SettingsTab = 'profile' | 'referrals' | 'security';

interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-settings-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css',
})
export class SettingsOverviewView implements OnInit {
  protected readonly store = inject(ProfileStore);
  private readonly agronomicApi = inject(AgronomicApiService);

  protected readonly tabs: SettingsTabDef[] = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'referrals', label: 'Referrals', icon: 'card_giftcard' },
    { id: 'security', label: 'Security', icon: 'shield' },
  ];

  protected readonly activeTab = signal<SettingsTab>('profile');

  protected readonly languageOptions = ['English', 'Español', 'Português'];

  // ----- Editable draft, seeded from the persisted profile -----
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly jobTitle = signal('');
  protected readonly language = signal('');
  protected readonly location = signal('');
  protected readonly specialtyArea = signal('');

  // ----- Real farm totals, derived live from My Plots -----
  protected readonly totalHectares = signal(0);
  protected readonly plotCount = signal(0);

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => {
    const current = this.tabs.find((tab) => tab.id === this.activeTab());
    return [
      { label: 'Settings', disabled: true },
      { label: current?.label ?? 'Profile', disabled: true },
    ];
  });

  /** Live preview of the marketplace card as the other party sees it. */
  protected readonly preview = computed<UserProfile>(() =>
    this.store.profile().withChanges({
      fullName: this.fullName(),
      specialtyArea: this.specialtyArea(),
      location: this.location(),
      totalHectares: this.totalHectares(),
      plotCount: this.plotCount(),
    }),
  );

  constructor() {
    // Refill the draft whenever a freshly loaded/saved profile arrives. This only
    // fires on a genuine profile change (load or save result), never mid-edit.
    effect(() => {
      const profile = this.store.profile();
      this.applyDraftFrom(profile);
    });
  }

  ngOnInit(): void {
    this.store.load();
    this.loadFarmTotals();
  }

  protected selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  /** Refills the draft signals from the persisted profile (header refresh). */
  protected resetDraft(): void {
    this.store.load();
    this.loadFarmTotals();
  }

  private applyDraftFrom(profile: UserProfile): void {
    this.fullName.set(profile.fullName);
    this.email.set(profile.email);
    this.phone.set(profile.phone);
    this.jobTitle.set(profile.jobTitle);
    this.language.set(profile.language);
    this.location.set(profile.location);
    this.specialtyArea.set(profile.specialtyArea);
  }

  /** Sums the real My Plots areas so the producer card shows true farm size. */
  private loadFarmTotals(): void {
    this.agronomicApi.getPlots().subscribe((plots) => {
      const hectares = plots.reduce((sum, plot) => sum + (plot.areaSize || 0), 0);
      this.totalHectares.set(Number(hectares.toFixed(1)));
      this.plotCount.set(plots.length);
    });
  }

  protected saveChanges(): void {
    this.store.save({
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      jobTitle: this.jobTitle().trim(),
      language: this.language(),
      location: this.location().trim(),
      specialtyArea: this.specialtyArea().trim(),
    });
  }
}
