/**
 * Application service store for the `Intervention` bounded context (Expert
 * Assistance). Coordinates the real intervention-request aggregate (create +
 * per-plot history) and specialist recommendations.
 *
 * Data-source note: intervention requests, specialist candidates, service
 * proposals and specialist contact are all served by the real backend. No
 * simulated data: recommended specialists are the real, geo-matched candidates
 * for the alert; an empty result surfaces a real empty state, never fake cards.
 *
 * @module InterventionStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, take } from 'rxjs';

import { InterventionApiService } from '../infrastructure/intervention-api.service';
import { CreateInterventionRequestRequest } from '../infrastructure/intervention-request-response';
import { SpecialistCandidate } from '../domain/model/specialist-candidate.entity';
import { ServiceProposal } from '../domain/model/service-proposal.entity';
import { SpecialistContact } from '../domain/model/specialist-contact.entity';
import { InterventionRequest } from '../domain/model/intervention-request.entity';

export interface InterventionLoadingState {
  specialists: boolean;
  requests: boolean;
  submitting: boolean;
  case: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class InterventionStore {
  private readonly interventionApi = inject(InterventionApiService);

  /** Recommended specialists for the selected plot's active alert (real, geo-matched). */
  readonly specialists = signal<SpecialistCandidate[]>([]);
  /** Whether a specialist match has been attempted for the current alert. */
  readonly specialistsLoaded = signal<boolean>(false);
  /** The producer's intervention requests for the selected plot (from the backend). */
  readonly requests = signal<InterventionRequest[]>([]);
  /** Whether the request history has loaded from the real backend at least once. */
  readonly requestsLoaded = signal<boolean>(false);

  /** The proposal for the case currently open in the case-detail view. */
  readonly activeProposal = signal<ServiceProposal | null>(null);
  /** The specialist contact for the open case (only once its proposal is accepted). */
  readonly activeContact = signal<SpecialistContact | null>(null);
  /**
   * The case's specialist as a full profile card, loaded by id so the case detail
   * shows them even when the recommendation list isn't loaded (e.g. on a direct
   * visit or reload). Independent of the accepted-only contact.
   */
  readonly activeSpecialist = signal<SpecialistCandidate | null>(null);

  readonly loading = signal<InterventionLoadingState>({
    specialists: false,
    requests: false,
    submitting: false,
    case: false,
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
   * Loads ranked specialists for an alert from the real geo-matching policy. The
   * returned set replaces the list verbatim (including empty), so the producer
   * only ever sees real, geo-matched candidates — never fabricated cards.
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
          this.specialists.set(specialists);
          this.specialistsLoaded.set(true);
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => {
          this.specialists.set([]);
          this.specialistsLoaded.set(true);
          this.registerError(error);
        },
      });
  }

  /** Clears recommended specialists (e.g. when switching to a plot with no active alert). */
  clearSpecialists(): void {
    this.specialists.set([]);
    this.specialistsLoaded.set(false);
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
   * Loads every request for the active producer (all plots). Used by the case
   * detail so a case resolves even when the per-plot overview list wasn't loaded
   * first (deep link, page refresh, or jumping straight from the success modal).
   */
  loadAllRequests(): void {
    this.setLoading('requests', true);

    this.interventionApi
      .getAllRequests()
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

  /** Finds a request by its human-facing reference code (e.g. "REQ-024"). */
  findRequestByCode(code: string): InterventionRequest | null {
    return this.requests().find((request) => request.referenceCode === code) ?? null;
  }

  /**
   * Loads the artifacts backing an open case: the specialist's proposal and,
   * once the proposal is accepted, the unlocked specialist contact. Resets the
   * previously loaded case first so stale data never leaks between cases.
   * @param {InterventionRequest} request the request backing the case
   */
  loadCaseArtifacts(request: InterventionRequest): void {
    this.activeProposal.set(null);
    this.activeContact.set(null);
    this.activeSpecialist.set(null);

    if (request.id == null) {
      return;
    }

    // Resolve the case's specialist by id so the identity cards populate even
    // when recommendations weren't loaded (direct visit / reload).
    if (request.specialistId != null) {
      this.loadSpecialistProfileCard(request.specialistId);
    }

    this.setLoading('case', true);
    this.interventionApi
      .getProposalsByRequest(request.id)
      .pipe(
        take(1),
        finalize(() => this.setLoading('case', false)),
      )
      .subscribe({
        next: (proposals) => {
          // A request carries at most one active proposal today; prefer the
          // accepted one, otherwise the latest submitted.
          const proposal =
            proposals.find((p) => p.status === 'ACCEPTED') ?? proposals[proposals.length - 1] ?? null;
          this.activeProposal.set(proposal);

          if (request.status === 'ACCEPTED' && request.specialistId != null) {
            this.loadContact(request.specialistId, request.id!);
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Fetches the specialist's contact details for an accepted case. The backend
   * gates this to accepted requests (403 otherwise), so a failure simply leaves
   * the contact locked.
   * @param {number|string} specialistId
   * @param {number|string} requestId
   */
  loadContact(specialistId: number | string, requestId: number | string): void {
    this.interventionApi
      .getSpecialistContact(specialistId, requestId)
      .pipe(take(1))
      .subscribe({
        next: (contact) => this.activeContact.set(contact),
        error: () => this.activeContact.set(null),
      });
  }

  /** Loads the case's specialist as a profile card for the identity/summary cards. */
  loadSpecialistProfileCard(specialistId: number | string): void {
    this.interventionApi
      .getSpecialistProfileCard(specialistId)
      .pipe(take(1))
      .subscribe({
        next: (specialist) => this.activeSpecialist.set(specialist),
        error: () => this.activeSpecialist.set(null),
      });
  }

  /**
   * Accepts the case's proposal on the backend, moving the request to ACCEPTED and
   * unlocking specialist contact, then refreshes the plot history and contact.
   * @param {string} code the request reference code
   * @param {(ok: boolean) => void} [onDone] callback with the outcome
   */
  acceptProposal(code: string, onDone?: (ok: boolean) => void): void {
    const request = this.findRequestByCode(code);
    const proposal = this.activeProposal();
    if (!request || proposal?.id == null) {
      onDone?.(false);
      return;
    }

    this.interventionApi
      .updateProposalStatus(proposal.id, 'ACCEPTED')
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.activeProposal.set(updated);
          if (request.plotId != null) {
            this.loadRequests(request.plotId);
          }
          if (request.specialistId != null && request.id != null) {
            this.loadContact(request.specialistId, request.id);
          }
          onDone?.(true);
        },
        error: (error) => {
          this.registerError(error);
          onDone?.(false);
        },
      });
  }

  /**
   * Declines the case on the backend and refreshes the plot history so the status
   * persists on reload. When a proposal has been received it is rejected (which
   * moves the request to DECLINED); otherwise the pending request itself is
   * declined. Either way the specialist search reopens.
   * @param {string} code the request reference code
   * @param {string} reason optional reason for declining
   * @param {(ok: boolean) => void} [onDone] callback with the outcome
   */
  declineProposal(code: string, reason: string, onDone?: (ok: boolean) => void): void {
    const request = this.findRequestByCode(code);
    if (!request || request.id == null) {
      onDone?.(false);
      return;
    }

    const proposal = this.activeProposal();
    const decline$: Observable<unknown> =
      proposal?.id != null
        ? this.interventionApi.updateProposalStatus(proposal.id, 'REJECTED', reason)
        : this.interventionApi.declineRequest(request.id, reason);

    decline$.pipe(take(1)).subscribe({
      next: () => {
        this.activeProposal.set(null);
        this.activeContact.set(null);
        if (request.plotId != null) {
          this.loadRequests(request.plotId);
        }
        onDone?.(true);
      },
      error: (error) => {
        this.registerError(error);
        onDone?.(false);
      },
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
