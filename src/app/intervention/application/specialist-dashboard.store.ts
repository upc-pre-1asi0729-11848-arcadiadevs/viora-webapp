import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import {
  IncomingRequest,
  PerformancePoint,
  SpecialistDashboard,
} from '../domain/model/specialist-dashboard.entity';
import { SpecialistDashboardApiService } from '../infrastructure/specialist-dashboard-api.service';

export type PerformanceView = 'monthly' | 'annual';

/**
 * Session-scoped store for the Specialist segment dashboard. Loads the real
 * read model once and caches it (mirroring the producer dashboard's behaviour),
 * exposes the monthly/annual performance toggle, and drives the verify/decline
 * actions on incoming producer requests. No simulated data: when the endpoint
 * is unavailable the view shows real empty states, never fabricated numbers.
 */
@Injectable({ providedIn: 'root' })
export class SpecialistDashboardStore {
  private readonly api = inject(SpecialistDashboardApiService);

  private readonly dashboardSignal = signal<SpecialistDashboard | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly loadedSignal = signal<boolean>(false);
  /** True when the last load failed (e.g. the endpoint is not reachable yet). */
  private readonly errorSignal = signal<boolean>(false);
  private readonly performanceViewSignal = signal<PerformanceView>('annual');

  readonly dashboard = this.dashboardSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly performanceView = this.performanceViewSignal.asReadonly();

  readonly kpis = computed(() => this.dashboardSignal()?.kpis ?? null);
  readonly zonalRisks = computed(() => this.dashboardSignal()?.zonalRisks ?? []);
  readonly incomingRequests = computed(() => this.dashboardSignal()?.incomingRequests ?? []);
  readonly updatedAt = computed(() => this.dashboardSignal()?.updatedAt ?? null);

  /** Performance series for the currently selected monthly/annual toggle. */
  readonly performanceSeries = computed<PerformancePoint[]>(() => {
    const data = this.dashboardSignal();
    if (!data) {
      return [];
    }
    return this.performanceViewSignal() === 'monthly'
      ? data.performanceMonthly
      : data.performanceAnnual;
  });

  /** Loads the dashboard once; later mounts reuse the cached read model. */
  load(): void {
    if (this.loadedSignal() || this.loadingSignal()) {
      return;
    }
    this.fetch();
  }

  /** Forces a reload (header refresh button). */
  refresh(): void {
    if (this.loadingSignal()) {
      return;
    }
    this.fetch();
  }

  setPerformanceView(view: PerformanceView): void {
    this.performanceViewSignal.set(view);
  }

  /** Verifies (accepts) an incoming request, then drops it from the queue. */
  verify(request: IncomingRequest): void {
    this.settleRequest(request, () => this.api.verifyRequest(request));
  }

  /** Declines an incoming request, then drops it from the queue. */
  decline(request: IncomingRequest): void {
    this.settleRequest(request, () => this.api.declineRequest(request));
  }

  private fetch(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(false);
    this.api.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboardSignal.set(dashboard);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
      error: () => {
        // Endpoint not reachable (e.g. not deployed yet) or a transient failure.
        // Surface a real empty state — never fabricated data.
        this.dashboardSignal.set(null);
        this.errorSignal.set(true);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
    });
  }

  /**
   * Optimistically removes the request from the incoming queue and calls the
   * action against the backend.
   */
  private settleRequest(
    request: IncomingRequest,
    action: () => Observable<unknown>,
  ): void {
    this.removeIncomingRequest(request.id);

    action().subscribe({
      // On success the queue is already updated. On error, reload so the view
      // reconciles with the backend (the request may still be pending).
      error: () => this.refresh(),
    });
  }

  private removeIncomingRequest(id: number | string): void {
    const current = this.dashboardSignal();
    if (!current) {
      return;
    }
    this.dashboardSignal.set({
      ...current,
      incomingRequests: current.incomingRequests.filter((item) => item.id !== id),
    });
  }
}
