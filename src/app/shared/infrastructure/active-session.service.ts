import { Injectable, computed, signal } from '@angular/core';

/** Persisted shape of the authenticated session. */
export interface SessionData {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

const STORAGE_KEY = 'viora.session';

/**
 * Holds the authenticated session (JWT + identity) for the whole app. Lives in
 * shared infrastructure so `BaseApi` can scope every request to the signed-in
 * user without depending on the IAM feature slice; the IAM auth store writes
 * through this service on sign-in/sign-out.
 */
@Injectable({ providedIn: 'root' })
export class ActiveSessionService {
  private readonly sessionSignal = signal<SessionData | null>(this.restore());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed<boolean>(() => this.sessionSignal() !== null);
  readonly isSpecialist = computed<boolean>(
    () => this.sessionSignal()?.role === 'ROLE_SPECIALIST',
  );

  /** The signed-in user's id, or null when signed out. */
  get userId(): number | null {
    return this.sessionSignal()?.userId ?? null;
  }

  /** The bearer token, or null when signed out. */
  get token(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  /** Starts a session after a successful sign-in/verification. */
  start(data: SessionData): void {
    this.sessionSignal.set(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable (private mode) — session stays in memory.
    }
  }

  /** Ends the session (sign-out). */
  clear(): void {
    this.sessionSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors on clear.
    }
  }

  private restore(): SessionData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as SessionData;
      return parsed?.token && parsed?.userId ? parsed : null;
    } catch {
      return null;
    }
  }
}
