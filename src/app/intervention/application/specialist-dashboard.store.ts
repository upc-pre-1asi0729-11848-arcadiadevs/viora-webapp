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
 * Representative snapshot shown when the real read model is unavailable (e.g.
 * before the specialist-dashboard endpoint is deployed, or on a transient
 * error). Keeps the Overview meaningful for the demo; the store swaps in the
 * real aggregate as soon as the backend responds.
 */
const FALLBACK_DASHBOARD: SpecialistDashboard = {
  kpis: {
    resolvedInterventions: 142,
    acceptanceRatePercent: 98,
    acceptanceRateDeltaPercent: 2.4,
    phytosanitaryEfficiencyPercent: 92.4,
    phytosanitaryStatus: 'optimal',
  },
  zonalRisks: [
    { id: 1, severity: 'HIGH', title: 'Late Blight Outbreak', distanceKm: 2.4, sector: 'Sect. 04' },
    { id: 2, severity: 'MEDIUM', title: 'Calcium Deficiency', distanceKm: 5.1, sector: 'Sect. 02' },
    { id: 3, severity: 'LOW', title: 'Early Pest Presence', distanceKm: 12.8, sector: 'Sect. 09' },
  ],
  incomingRequests: [
    {
      id: 'demo-1',
      referenceCode: 'REQ-2401',
      plotLabel: 'Hacienda Real',
      growerLabel: 'Don Ricardo S.A.',
      problem: 'Unidentified Fungus',
      createdAt: new Date('2026-05-14T09:30:00'),
    },
    {
      id: 'demo-2',
      referenceCode: 'REQ-2402',
      plotLabel: 'Santa Rosa 2',
      growerLabel: 'AgroExport S.A.C.',
      problem: 'Soil Mineralization',
      createdAt: new Date('2026-05-14T11:15:00'),
    },
  ],
  performanceMonthly: [
    { label: 'ENE', value: 8 },
    { label: 'FEB', value: 12 },
    { label: 'MAR', value: 15 },
    { label: 'ABR', value: 11 },
    { label: 'MAY', value: 18 },
    { label: 'JUN', value: 16 },
    { label: 'JUL', value: 22 },
    { label: 'AGO', value: 19 },
    { label: 'SEP', value: 25 },
    { label: 'OCT', value: 14 },
    { label: 'NOV', value: 20 },
    { label: 'DIC', value: 26 },
  ],
  performanceAnnual: [
    { label: '2021', value: 96 },
    { label: '2022', value: 118 },
    { label: '2023', value: 134 },
    { label: '2024', value: 142 },
  ],
  updatedAt: new Date(),
};

/**
 * Session-scoped store for the Specialist segment dashboard. Loads the real
 * read model once and caches it (mirroring the producer dashboard's behaviour),
 * exposes the monthly/annual performance toggle, and drives the verify/decline
 * actions on incoming producer requests.
 */
@Injectable({ providedIn: 'root' })
export class SpecialistDashboardStore {
  private readonly api = inject(SpecialistDashboardApiService);

  private readonly dashboardSignal = signal<SpecialistDashboard | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly loadedSignal = signal<boolean>(false);
  /** True when the representative snapshot is being shown instead of live data. */
  private readonly usingFallbackSignal = signal<boolean>(false);
  private readonly performanceViewSignal = signal<PerformanceView>('annual');

  readonly dashboard = this.dashboardSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();
  readonly usingFallback = this.usingFallbackSignal.asReadonly();
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
    this.api.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboardSignal.set(dashboard);
        this.usingFallbackSignal.set(false);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
      error: () => {
        // Endpoint not deployed yet or a transient failure: keep the Overview
        // meaningful with the representative snapshot instead of an empty page.
        if (!this.dashboardSignal()) {
          this.dashboardSignal.set(FALLBACK_DASHBOARD);
        }
        this.usingFallbackSignal.set(true);
        this.loadingSignal.set(false);
        this.loadedSignal.set(true);
      },
    });
  }

  /**
   * Optimistically removes the request from the incoming queue and calls the
   * action. In fallback mode there is no persisted request to act on, so the
   * removal is purely local; either way the specialist sees an immediate result.
   */
  private settleRequest(
    request: IncomingRequest,
    action: () => Observable<unknown>,
  ): void {
    this.removeIncomingRequest(request.id);

    if (this.usingFallbackSignal()) {
      return;
    }

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
