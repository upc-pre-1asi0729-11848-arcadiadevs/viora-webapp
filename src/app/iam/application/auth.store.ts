/**
 * Application service store for IAM authentication. Drives the Login, Register
 * and Verify screens against the real backend, and owns the transition into an
 * authenticated session (via the shared ActiveSessionService, which every API
 * gateway reads the userId from).
 *
 * @module AuthStore
 */
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  ActiveSessionService,
  SessionData,
} from '../../shared/infrastructure/active-session.service';
import { AuthApiService } from '../infrastructure/auth-api.service';
import { AuthenticatedUserResource, SignUpRequest } from '../infrastructure/auth-response';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApiService);
  private readonly session = inject(ActiveSessionService);
  private readonly router = inject(Router);

  private readonly busySignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly needsVerificationSignal = signal<boolean>(false);
  private readonly infoSignal = signal<string | null>(null);

  readonly busy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /** True when sign-in failed because the email is not verified yet. */
  readonly needsVerification = this.needsVerificationSignal.asReadonly();
  readonly info = this.infoSignal.asReadonly();

  /** Signs in by email and routes to the role's home on success. */
  signIn(email: string, password: string): void {
    this.beginRequest();
    this.api
      .signIn({ email: email.trim().toLowerCase(), password })
      .pipe(finalize(() => this.busySignal.set(false)))
      .subscribe({
        next: (auth) => this.enterSession(auth),
        error: (err) => {
          const message: string = err?.error?.message ?? '';
          if (err?.status === 422 || message.toLowerCase().includes('verify')) {
            this.needsVerificationSignal.set(true);
            this.errorSignal.set('Your email is not verified yet. Check your inbox or resend the email.');
          } else if (err?.status === 404) {
            this.errorSignal.set('No account found with that email.');
          } else if (err?.status === 403) {
            this.errorSignal.set('This account has been deactivated.');
          } else {
            this.errorSignal.set('Invalid email or password.');
          }
        },
      });
  }

  /** Registers a new account; onDone(true) moves the page to its success state. */
  signUp(request: SignUpRequest, onDone?: (ok: boolean) => void): void {
    this.beginRequest();
    this.api
      .signUp({ ...request, email: request.email.trim().toLowerCase() })
      .pipe(finalize(() => this.busySignal.set(false)))
      .subscribe({
        next: () => onDone?.(true),
        error: (err) => {
          const message: string = err?.error?.message ?? '';
          if (err?.status === 409) {
            this.errorSignal.set('An account with this email already exists.');
          } else if (message.toLowerCase().includes('referral')) {
            this.errorSignal.set('That referral code does not exist. Remove it or fix it.');
          } else {
            this.errorSignal.set(message || 'Could not create your account. Check the form and try again.');
          }
          onDone?.(false);
        },
      });
  }

  /** Consumes the emailed token; on success the user is signed in directly. */
  verify(token: string, onDone?: (ok: boolean) => void): void {
    this.beginRequest();
    this.api
      .verify(token)
      .pipe(finalize(() => this.busySignal.set(false)))
      .subscribe({
        next: (auth) => {
          onDone?.(true);
          this.enterSession(auth);
        },
        error: (err) => {
          this.errorSignal.set(
            err?.error?.message ?? 'This verification link is invalid, expired or already used.',
          );
          onDone?.(false);
        },
      });
  }

  /** Re-sends the verification email for an unverified account. */
  resendVerification(email: string): void {
    this.beginRequest();
    this.api
      .resendVerification(email.trim().toLowerCase())
      .pipe(finalize(() => this.busySignal.set(false)))
      .subscribe({
        next: () => this.infoSignal.set('Verification email sent. Check your inbox.'),
        error: (err) =>
          this.errorSignal.set(err?.error?.message ?? 'Could not resend the verification email.'),
      });
  }

  /** Ends the session and returns to the login screen. */
  logout(): void {
    this.session.clear();
    this.router.navigate(['/login']);
  }

  clearMessages(): void {
    this.errorSignal.set(null);
    this.infoSignal.set(null);
    this.needsVerificationSignal.set(false);
  }

  private beginRequest(): void {
    this.busySignal.set(true);
    this.clearMessages();
  }

  /** Persists the session and routes to the home screen for the user's role. */
  private enterSession(auth: AuthenticatedUserResource): void {
    if (!auth?.token || auth.id == null) {
      this.errorSignal.set('Unexpected response from the server.');
      return;
    }
    const session: SessionData = {
      token: auth.token,
      userId: auth.id,
      email: auth.email ?? '',
      fullName: auth.fullName ?? '',
      role: auth.role ?? 'ROLE_GROWER',
    };
    this.session.start(session);
    this.router.navigate([session.role === 'ROLE_SPECIALIST' ? '/specialist' : '/dashboard']);
  }
}
