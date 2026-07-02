/**
 * Application service store for the `Profile` bounded context (Profile & Asset
 * Management). Owns the account holder's editable profile that backs the
 * Settings screens.
 *
 * Data-source note: the Profile & Asset Management backend (and the IAM guards
 * around it) are not built yet — this is one of the Support bounded contexts
 * still pending. The profile is therefore held locally and persisted to
 * localStorage so edits survive a reload. When the backend lands, `save` and
 * `load` become the only touch points that need to call the real API.
 *
 * @module ProfileStore
 */
import { Injectable, computed, signal } from '@angular/core';

import { UserProfile, UserProfileProps } from '../domain/model/user-profile.entity';

const STORAGE_KEY = 'viora.profile';

/**
 * Seed profile for the current producer, adapted from the account holder. Used
 * until the real Profile & Asset Management backend is wired.
 */
const PRODUCER_SEED: UserProfileProps = {
  id: 1,
  role: 'producer',
  fullName: 'Daron Cameloft',
  email: 'daron.cameloft@viora.farm',
  phone: '+51 952 481 032',
  jobTitle: 'Farm Operations Lead',
  roleLabel: 'Olive producer',
  timezone: 'America/Lima (GMT-5)',
  language: 'English',
  location: 'Valle de Ica, Peru',
  specialtyArea: 'Olive oil production',
  yearsExperience: 8,
  focusTags: ['Xylella monitoring', 'Biological stress', 'Field inspection'],
  availableToday: true,
};

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly profileSignal = signal<UserProfile>(new UserProfile(PRODUCER_SEED));
  private readonly savingSignal = signal<boolean>(false);
  private readonly lastSavedAtSignal = signal<Date | null>(null);

  /** The current, persisted profile. */
  readonly profile = this.profileSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();

  /**
   * Relative caption for the dashboard header. The header already renders the
   * "Updated ·" prefix, so this returns only the trailing part.
   */
  readonly lastSyncLabel = computed<string>(() => {
    const savedAt = this.lastSavedAtSignal();
    if (!savedAt) {
      return 'No changes saved yet';
    }
    return this.relativeTime(savedAt);
  });

  constructor() {
    this.restore();
  }

  /**
   * Commits the edited profile. Local-only for now (see module note); the async
   * shape and `saving` flag are kept so the real backend call slots in cleanly.
   */
  save(changes: UserProfileProps, onDone?: (saved: UserProfile) => void): void {
    this.savingSignal.set(true);
    const updated = this.profileSignal().withChanges(changes);

    // Simulate the round-trip latency of the pending backend so the UI shows a
    // saving state; replace with the real API call once IAM/Profile ships.
    setTimeout(() => {
      this.profileSignal.set(updated);
      this.lastSavedAtSignal.set(new Date());
      this.persist(updated);
      this.savingSignal.set(false);
      onDone?.(updated);
    }, 400);
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const props = JSON.parse(raw) as UserProfileProps;
        this.profileSignal.set(new UserProfile({ ...PRODUCER_SEED, ...props }));
      }
    } catch {
      // Corrupt payload — fall back to the seed.
    }
  }

  private persist(profile: UserProfile): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const props: UserProfileProps = {
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      jobTitle: profile.jobTitle,
      roleLabel: profile.roleLabel,
      timezone: profile.timezone,
      language: profile.language,
      location: profile.location,
      specialtyArea: profile.specialtyArea,
      yearsExperience: profile.yearsExperience,
      focusTags: profile.focusTags,
      availableToday: profile.availableToday,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(props));
  }

  private relativeTime(date: Date): string {
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) {
      return 'just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
  }
}
