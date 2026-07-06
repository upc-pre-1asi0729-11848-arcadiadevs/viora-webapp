/**
 * Gate for the payment-first SaaS model: tells the workspace guard whether the
 * signed-in user has an active subscription. The result is cached so navigation
 * stays instant; the payment-return flow marks it active optimistically and a
 * fresh sign-out resets it.
 *
 * @module SubscriptionAccessService
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { SubscriptionApiService } from '../infrastructure/subscription-api.service';

type AccessStatus = 'unknown' | 'active' | 'inactive';

@Injectable({ providedIn: 'root' })
export class SubscriptionAccessService {
  private readonly api = inject(SubscriptionApiService);

  private readonly statusSignal = signal<AccessStatus>('unknown');
  readonly hasActiveAccess = computed<boolean>(() => this.statusSignal() === 'active');

  /**
   * Resolves whether the signed-in user may enter the workspace. Uses the cached
   * verdict when known; otherwise reads the real subscription (a missing or
   * non-active subscription counts as no access).
   */
  check(): Observable<boolean> {
    if (this.statusSignal() === 'active') {
      return of(true);
    }
    return this.api.getSubscription().pipe(
      map((subscription) => {
        const active = subscription?.status === 'ACTIVE';
        this.statusSignal.set(active ? 'active' : 'inactive');
        return active;
      }),
      catchError(() => {
        // 404 (no subscription yet) or a transient error — treat as no access.
        this.statusSignal.set('inactive');
        return of(false);
      }),
    );
  }

  /** Optimistically grants access after an approved payment return. */
  markActive(): void {
    this.statusSignal.set('active');
  }

  /** Clears the cached verdict (on sign-out, so the next user is re-checked). */
  reset(): void {
    this.statusSignal.set('unknown');
  }
}
