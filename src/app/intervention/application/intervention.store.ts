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
import {
  InterventionRequest,
  InterventionRequestStatus,
} from '../domain/model/intervention-request.entity';

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

/** Minutes-ago ISO helper for recent presentation timestamps. */
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60000).toISOString();

/**
 * Presentation dataset of the producer's requests for the selected plot, matching
 * the Expert Assistance design. Used until the real `GET /intervention-requests`
 * endpoint is deployed; real requests replace it once the endpoint returns data.
 */
const PRESENTATION_REQUESTS: InterventionRequest[] = [
  new InterventionRequest({
    id: 24,
    referenceCode: 'REQ-024',
    plotId: 1,
    specialistId: 890,
    alertId: 1,
    reason: 'Possible Xylella-related pattern detected from symptom report and NDVI variation.',
    status: 'AWAITING_RESPONSE',
    createdAt: minutesAgo(45),
    updatedAt: minutesAgo(10),
  }),
  new InterventionRequest({
    id: 21,
    referenceCode: 'REQ-021',
    plotId: 1,
    specialistId: 891,
    alertId: 2,
    reason: 'Leaf symptoms observed on the south block; requesting field inspection.',
    status: 'PROPOSAL_RECEIVED',
    createdAt: '2026-05-03T15:00:00Z',
    updatedAt: '2026-05-04T19:30:00Z',
  }),
  new InterventionRequest({
    id: 18,
    referenceCode: 'REQ-018',
    plotId: 1,
    specialistId: 892,
    alertId: 3,
    reason: 'Requesting a second opinion on olive disease assessment.',
    status: 'DECLINED',
    createdAt: '2026-04-29T14:00:00Z',
    updatedAt: '2026-04-29T16:20:00Z',
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
  readonly requests = signal<InterventionRequest[]>(PRESENTATION_REQUESTS);
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
          if (requests.length > 0) {
            this.requests.set(requests);
          }
          this.requestsLoaded.set(true);
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Finds a request by its human-facing reference code (e.g. "REQ-024"). */
  findRequestByCode(code: string): InterventionRequest | null {
    return this.requests().find((request) => request.referenceCode === code) ?? null;
  }

  /**
   * Marks a proposal as accepted for a case, unlocking specialist contact. Applied
   * locally: the case lifecycle beyond request creation is not persisted yet
   * (no specialist app submits proposals), so this drives the in-interface update.
   * @param {string} code the request reference code
   */
  acceptProposal(code: string): void {
    this.updateStatus(code, 'ACCEPTED');
  }

  /**
   * Declines the current proposal, returning the case to specialist search. Applied
   * locally for now; see {@link acceptProposal}.
   * @param {string} code the request reference code
   */
  declineProposal(code: string): void {
    this.updateStatus(code, 'DECLINED');
  }

  private updateStatus(code: string, status: InterventionRequestStatus): void {
    this.requests.update((requests) =>
      requests.map((request) =>
        request.referenceCode === code
          ? new InterventionRequest({
              id: request.id,
              referenceCode: request.referenceCode,
              growerId: request.growerId,
              plotId: request.plotId,
              specialistId: request.specialistId,
              alertId: request.alertId,
              reason: request.reason,
              message: request.message,
              status,
              createdAt: request.createdAt,
              updatedAt: new Date().toISOString(),
            })
          : request,
      ),
    );
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
