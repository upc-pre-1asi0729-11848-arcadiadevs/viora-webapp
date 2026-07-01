/**
 * Application service store for the `Intervention` bounded context (Expert
 * Assistance). Coordinates the real intervention-request aggregate (create +
 * per-plot history) and specialist recommendations.
 *
 * Data-source note: the backend `specialist-candidates` matching policy and the
 * request-metrics service are stubs today, so specialists and the request
 * history fall back to presentation datasets (mirroring the surveillance
 * `autonomousDetections` pattern) until those services are implemented. The real
 * endpoints are still called and transparently take over once they return data.
 *
 * @module InterventionStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { InterventionApiService } from '../infrastructure/intervention-api.service';
import { CreateInterventionRequestRequest } from '../infrastructure/intervention-request-response';
import { SpecialistCandidate } from '../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../domain/model/intervention-request.entity';

export interface InterventionLoadingState {
  specialists: boolean;
  requests: boolean;
  submitting: boolean;
}

/**
 * Presentation dataset of recommended specialists, matching the Expert
 * Assistance design. Used until the backend `SpecialistMatchingPolicy` is
 * implemented; real candidates replace it once the endpoint returns a ranked set.
 */
const PRESENTATION_SPECIALISTS: SpecialistCandidate[] = [
  new SpecialistCandidate({
    id: 890,
    name: 'Valeria Rojas',
    role: 'Phytosanitary specialist',
    successRate: 96,
    caseCount: 24,
    distanceKm: 6.4,
    tags: ['Xylella monitoring', 'Biological stress', 'Field inspection'],
    availability: 'today',
    bestMatch: true,
  }),
  new SpecialistCandidate({
    id: 891,
    name: 'Marco Salcedo',
    role: 'Agricultural pest technician',
    successRate: 92,
    caseCount: 17,
    distanceKm: 9.1,
    tags: ['Leaf symptoms', 'Low-vigor inspection', 'Treatment follow-up'],
    availability: 'tomorrow',
  }),
  new SpecialistCandidate({
    id: 892,
    name: 'Camila Torres',
    role: 'Crop health consultant',
    successRate: 94,
    caseCount: 31,
    distanceKm: 12.8,
    tags: ['Olive disease assessment', 'Technical prescriptions'],
    availability: 'week',
  }),
];

@Injectable({
  providedIn: 'root',
})
export class InterventionStore {
  private readonly interventionApi = inject(InterventionApiService);

  /** Recommended specialists for the selected plot's active alert. */
  readonly specialists = signal<SpecialistCandidate[]>(PRESENTATION_SPECIALISTS);
  /** The producer's intervention requests for the selected plot. */
  readonly requests = signal<InterventionRequest[]>([]);
  /** Whether the request history has loaded from the real backend at least once. */
  readonly requestsLoaded = signal<boolean>(false);

  readonly loading = signal<InterventionLoadingState>({
    specialists: false,
    requests: false,
    submitting: false,
  });

  readonly errors = signal<unknown[]>([]);
  readonly lastSyncedAt = signal<number | null>(null);

  /** Specialists available to take the case now or soon. */
  readonly availableSpecialists = computed<SpecialistCandidate[]>(() =>
    this.specialists().filter((specialist) => specialist.isAvailable),
  );

  readonly availableSpecialistsCount = computed<number>(() => this.availableSpecialists().length);

  /** Best-ranked available specialist (drives the pre-selected request target). */
  readonly bestMatch = computed<SpecialistCandidate | null>(() => {
    const available = this.availableSpecialists();
    return available.find((specialist) => specialist.bestMatch) ?? available[0] ?? null;
  });

  /** Requests still waiting on a specialist response. */
  readonly pendingRequests = computed<InterventionRequest[]>(() =>
    this.requests().filter((request) => request.isPending),
  );

  readonly pendingRequestsCount = computed<number>(() => this.pendingRequests().length);

  /** Relative label for the header's "Updated N min ago" chip. */
  readonly lastSyncLabel = computed<string>(() => {
    const syncedAt = this.lastSyncedAt();
    if (!syncedAt) {
      return 'Not synced yet';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - syncedAt) / 60000));
    if (diffMinutes < 1) {
      return 'Updated just now';
    }
    if (diffMinutes < 60) {
      return `Updated ${diffMinutes} min ago`;
    }
    return `Updated ${Math.round(diffMinutes / 60)} h ago`;
  });

  /**
   * Loads ranked specialists for an alert. The backend matching policy is a stub
   * that returns a single generic candidate, so its result is only adopted once
   * it returns a real ranked set (more than one); otherwise the presentation
   * dataset is kept.
   * @param {number|string} alertId
   */
  loadSpecialists(alertId: number | string): void {
    this.setLoading('specialists', true);

    this.interventionApi
      .getSpecialistCandidates(alertId, 3)
      .pipe(
        take(1),
        finalize(() => this.setLoading('specialists', false)),
      )
      .subscribe({
        next: (specialists) => {
          if (specialists.length > 1) {
            this.specialists.set(specialists);
          }
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Loads the per-plot request history from the real backend. Keeps the current
   * list if the endpoint is unavailable or returns nothing.
   * @param {number|string} plotId
   */
  loadRequests(plotId: number | string): void {
    this.setLoading('requests', true);

    this.interventionApi
      .getRequestsByPlot(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('requests', false)),
      )
      .subscribe({
        next: (requests) => {
          this.requests.set(requests);
          this.requestsLoaded.set(true);
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Sends an intervention request to a specialist. On success the plot history is
   * refreshed and the created request is passed to the callback (for the success
   * modal).
   * @param request the request payload (grower/userId injected by the API service)
   * @param onDone optional callback with the created request (or null on failure)
   */
  submitRequest(
    request: Omit<CreateInterventionRequestRequest, 'growerId'>,
    onDone?: (created: InterventionRequest | null) => void,
  ): void {
    this.setLoading('submitting', true);

    this.interventionApi
      .createRequest(request)
      .pipe(
        take(1),
        finalize(() => this.setLoading('submitting', false)),
      )
      .subscribe({
        next: (created) => {
          this.loadRequests(request.plotId);
          onDone?.(created);
        },
        error: (error) => {
          this.registerError(error);
          onDone?.(null);
        },
      });
  }

  /** Resolves a specialist display name from the loaded set, for the history table. */
  specialistName(specialistId: number | null): string {
    if (specialistId == null) {
      return '—';
    }
    const match = this.specialists().find(
      (specialist) => String(specialist.id) === String(specialistId),
    );
    return match?.name ?? `Specialist #${specialistId}`;
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  private setLoading(key: keyof InterventionLoadingState, value: boolean): void {
    this.loading.update((state) => ({ ...state, [key]: value }));
  }

  private registerError(error: unknown): void {
    this.errors.update((errors) => [...errors, error]);
  }
}
