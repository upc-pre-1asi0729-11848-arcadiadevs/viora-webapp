/**
 * Application service store for IAM account-security (Settings › Security).
 * Coordinates the real password-change, active-sessions and account-deactivation
 * endpoints for the active user.
 *
 * @module SecurityStore
 */
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { IamApiService } from '../infrastructure/iam-api.service';
import { ChangePasswordRequest } from '../infrastructure/iam-response';
import { UserSession } from '../domain/model/user-session.entity';

@Injectable({ providedIn: 'root' })
export class SecurityStore {
  private readonly api = inject(IamApiService);

  private readonly sessionsSignal = signal<UserSession[]>([]);
  private readonly loadingSessionsSignal = signal<boolean>(false);
  private readonly changingPasswordSignal = signal<boolean>(false);
  private readonly deactivatingSignal = signal<boolean>(false);

  readonly sessions = this.sessionsSignal.asReadonly();
  readonly loadingSessions = this.loadingSessionsSignal.asReadonly();
  readonly changingPassword = this.changingPasswordSignal.asReadonly();
  readonly deactivating = this.deactivatingSignal.asReadonly();

  /** Loads the active user's sessions. */
  loadSessions(): void {
    this.loadingSessionsSignal.set(true);
    this.api
      .getSessions()
      .pipe(finalize(() => this.loadingSessionsSignal.set(false)))
      .subscribe({
        next: (sessions) => this.sessionsSignal.set(sessions),
        error: () => {},
      });
  }

  /** Revokes a session, dropping it from the list on success. */
  revokeSession(sessionId: number | string): void {
    this.api.revokeSession(sessionId).subscribe({
      next: () =>
        this.sessionsSignal.update((sessions) =>
          sessions.filter((session) => String(session.id) !== String(sessionId)),
        ),
      error: () => {},
    });
  }

  /** Changes the password; reports success/failure (with message) to the caller. */
  changePassword(
    request: ChangePasswordRequest,
    onDone?: (ok: boolean, message?: string) => void,
  ): void {
    this.changingPasswordSignal.set(true);
    this.api
      .changePassword(request)
      .pipe(finalize(() => this.changingPasswordSignal.set(false)))
      .subscribe({
        next: () => onDone?.(true),
        error: (err) =>
          onDone?.(false, err?.error?.message ?? 'Could not update your password. Check your current password.'),
      });
  }

  /** Deactivates the account; reports completion to the caller. */
  deactivateAccount(onDone?: (ok: boolean) => void): void {
    this.deactivatingSignal.set(true);
    this.api
      .deactivateAccount()
      .pipe(finalize(() => this.deactivatingSignal.set(false)))
      .subscribe({
        next: () => onDone?.(true),
        error: () => onDone?.(false),
      });
  }
}
