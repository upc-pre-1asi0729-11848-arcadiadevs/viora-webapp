import { Component, computed, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

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
export class SettingsOverviewView {
  protected readonly store = inject(ProfileStore);

  protected readonly tabs: SettingsTabDef[] = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'referrals', label: 'Referrals', icon: 'card_giftcard' },
    { id: 'security', label: 'Security', icon: 'shield' },
  ];

  protected readonly activeTab = signal<SettingsTab>('profile');

  protected readonly timezoneOptions = [
    'America/Lima (GMT-5)',
    'America/Bogota (GMT-5)',
    'America/Santiago (GMT-4)',
    'America/Sao_Paulo (GMT-3)',
    'Europe/Madrid (GMT+1)',
    'UTC (GMT+0)',
  ];

  protected readonly languageOptions = ['English', 'Español', 'Português'];

  // ----- Editable draft, seeded from the persisted profile -----
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly jobTitle = signal('');
  protected readonly timezone = signal('');
  protected readonly language = signal('');
  protected readonly location = signal('');
  protected readonly specialtyArea = signal('');
  protected readonly yearsExperience = signal(0);
  protected readonly focusTags = signal<string[]>([]);
  protected readonly availableToday = signal(false);
  protected readonly newTag = signal('');

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
      yearsExperience: this.yearsExperience(),
      focusTags: this.focusTags(),
      availableToday: this.availableToday(),
      location: this.location(),
    }),
  );

  constructor() {
    this.resetDraft();
  }

  protected selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  /** Refills the draft signals from the persisted profile (header refresh). */
  protected resetDraft(): void {
    const profile = this.store.profile();
    this.fullName.set(profile.fullName);
    this.email.set(profile.email);
    this.phone.set(profile.phone);
    this.jobTitle.set(profile.jobTitle);
    this.timezone.set(profile.timezone);
    this.language.set(profile.language);
    this.location.set(profile.location);
    this.specialtyArea.set(profile.specialtyArea);
    this.yearsExperience.set(profile.yearsExperience);
    this.focusTags.set([...profile.focusTags]);
    this.availableToday.set(profile.availableToday);
    this.newTag.set('');
  }

  protected addTag(): void {
    const tag = this.newTag().trim();
    if (!tag) {
      return;
    }
    const exists = this.focusTags().some((t) => t.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      this.focusTags.update((tags) => [...tags, tag]);
    }
    this.newTag.set('');
  }

  protected removeTag(tag: string): void {
    this.focusTags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected toggleAvailability(): void {
    this.availableToday.update((value) => !value);
  }

  protected saveChanges(): void {
    this.store.save({
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      jobTitle: this.jobTitle().trim(),
      timezone: this.timezone(),
      language: this.language(),
      location: this.location().trim(),
      specialtyArea: this.specialtyArea().trim(),
      yearsExperience: Number(this.yearsExperience()) || 0,
      focusTags: this.focusTags(),
      availableToday: this.availableToday(),
    });
  }
}
