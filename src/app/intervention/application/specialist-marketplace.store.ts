import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { MarketplaceCase, SpecialistMarketplace } from '../domain/model/marketplace-case.entity';
import {
  SpecialistMarketplaceApiService,
  SubmitProposalRequest,
} from '../infrastructure/specialist-marketplace-api.service';

/**
 * Session-scoped store for the specialist Intervention Marketplace. Loads the real
 * read model once and caches it (mirroring the specialist dashboard), and drives
 * the two case actions — submit a proposal, decline — against the real backend.
 *
 * No simulated data: when the endpoint is unavailable the view shows a real empty
 * state and an `error` flag, never fabricated cases. Both actions optimistically
 * remove the case from the inbox (it leaves the specialist's PENDING queue on the
 * backend); a failure reloads so the view reconciles.
 */
@Injectable({ providedIn: 'root' })
export class SpecialistMarketplaceStore {
  private readonly api = inject(SpecialistMarketplaceApiService);

  private readonly marketplaceSignal = signal<SpecialistMarketplace | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly loadedSignal = signal<boolean>(false);
  private readonly errorSignal = signal<boolean>(false);
  private readonly submittingSignal = signal<boolean>(false);

  readonly loading = this.loadingSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();

  readonly cases = computed<MarketplaceCase[]>(() => this.marketplaceSignal()?.cases ?? []);
  readonly newCasesCount = computed<number>(() => this.cases().length);
  readonly acceptanceRatePercent = computed<number | null>(
    () => this.marketplaceSignal()?.acceptanceRatePercent ?? null,
  );
  readonly activeCasesCount = computed<number>(() => this.marketplaceSignal()?.activeCasesCount ?? 0);
  readonly updatedAt = computed<Date | null>(() => this.marketplaceSignal()?.updatedAt ?? null);

  /** Loads the marketplace once; later mounts reuse the cached read model. */
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

  /**
   * Submits a proposal for a case, then drops it from the inbox. Reports the
   * outcome so the view can close the modal or surface a failure.
   */
  submitProposal(
    caseItem: MarketplaceCase,
    payload: Omit<SubmitProposalRequest, 'interventionRequestId' | 'specialistId'>,
    onDone?: (ok: boolean) => void,
  ): void {
    if (caseItem.specialistId == null) {
      onDone?.(false);
      return;
    }

    this.submittingSignal.set(true);
    this.api
      .submitProposal({
        interventionRequestId: caseItem.id,
        specialistId: caseItem.specialistId,
        ...payload,
      })
      .pipe(
        take(1),
        finalize(() => this.submittingSignal.set(false)),
      )
      .subscribe({
        next: () => {
          this.removeCase(caseItem.id);
          onDone?.(true);
        },
        error: () => onDone?.(false),
      });
  }

  /** Declines a case, then drops it from the inbox. */
  decline(caseItem: MarketplaceCase, reason = ''): void {
    this.removeCase(caseItem.id);
    this.api
      .declineCase(caseItem.id, reason)
      .pipe(take(1))
      .subscribe({
        // On success the inbox is already updated; on error reload to reconcile.
        error: () => this.refresh(),
      });
  }

  private fetch(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(false);
    this.api
      .getMarketplace()
      .pipe(take(1))
      .subscribe({
        next: (marketplace) => {
          this.marketplaceSignal.set(marketplace);
          this.loadingSignal.set(false);
          this.loadedSignal.set(true);
        },
        error: () => {
          // Endpoint not reachable (e.g. not deployed yet) or a transient failure:
          // surface a real empty state — never fabricated data.
          this.marketplaceSignal.set(null);
          this.errorSignal.set(true);
          this.loadingSignal.set(false);
          this.loadedSignal.set(true);
        },
      });
  }

  private removeCase(id: number | string): void {
    const current = this.marketplaceSignal();
    if (!current) {
      return;
    }
    this.marketplaceSignal.set({
      ...current,
      cases: current.cases.filter((item) => item.id !== id),
    });
  }
}
