/**
 * Application service store for the `Profile` bounded context (Profile & Asset
 * Management). Owns the account holder's editable profile that backs the
 * Settings screens.
 *
 * Data-source note: the profile is a REAL backend aggregate served by the Viora
 * Platform (`GET/PUT /api/v1/profiles/{userId}`). It is seeded server-side for
 * the active account, so the screen always has real data. Total farmed area is
 * NOT part of this aggregate — it is derived live from the real My Plots data by
 * the view (see settings-overview).
 *
 * @module ProfileStore
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { UserProfile } from '../domain/model/user-profile.entity';
import { ProfileApiService } from '../infrastructure/profile-api.service';
import { UpdateProfileRequest } from '../infrastructure/profile-response';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfileApiService);

  private readonly profileSignal = signal<UserProfile>(new UserProfile());
  private readonly savingSignal = signal<boolean>(false);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly lastSavedAtSignal = signal<Date | null>(null);

  /** The current, persisted profile. */
  readonly profile = this.profileSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

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

  /** Loads the active account holder's profile from the backend. */
  load(): void {
    this.loadingSignal.set(true);
    this.api
      .getProfile()
      .pipe(finalize(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (profile) => this.profileSignal.set(profile),
        error: () => {
          // Leave the current profile in place; the view stays usable and the
          // user can retry via the header refresh.
        },
      });
  }

  /** Commits the edited profile to the backend. */
  save(changes: UpdateProfileRequest, onDone?: (saved: UserProfile) => void): void {
    this.savingSignal.set(true);
    this.api
      .updateProfile(changes)
      .pipe(finalize(() => this.savingSignal.set(false)))
      .subscribe({
        next: (saved) => {
          this.profileSignal.set(saved);
          this.lastSavedAtSignal.set(new Date());
          onDone?.(saved);
        },
        error: () => {
          // Keep the draft so the user can retry; no partial state is committed.
        },
      });
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
