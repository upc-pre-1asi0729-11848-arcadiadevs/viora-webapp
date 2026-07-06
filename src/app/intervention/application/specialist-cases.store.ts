import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, of, switchMap, take, throwError } from 'rxjs';

import { SpecialistCase, SpecialistCases } from '../domain/model/specialist-case.entity';
import {
  LogFieldInspectionRequest,
  PrescribeTreatmentRequest,
  SpecialistCasesApiService,
} from '../infrastructure/specialist-cases-api.service';

/**
 * Session-scoped store for the specialist's own cases, shared by My Requests and
 * Field Inspection. Loads the real read model once and exposes section selectors
 * for each screen; the field-inspection actions drive the real prescription
 * lifecycle and reload so the case moves to its next stage.
 *
 * No simulated data: an unreachable endpoint surfaces a real empty state.
 */
@Injectable({ providedIn: 'root' })
export class SpecialistCasesStore {
  private readonly api = inject(SpecialistCasesApiService);

  private readonly dataSignal = signal<SpecialistCases | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly loadedSignal = signal<boolean>(false);
  private readonly errorSignal = signal<boolean>(false);
  private readonly submittingSignal = signal<boolean>(false);

  readonly loading = this.loadingSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly submitting = this.submittingSignal.asReadonly();

  readonly data = this.dataSignal.asReadonly();
  readonly cases = computed<SpecialistCase[]>(() => this.dataSignal()?.cases ?? []);
  readonly acceptanceRatePercent = computed<number | null>(
    () => this.dataSignal()?.acceptanceRatePercent ?? null,
  );
  readonly updatedAt = computed<Date | null>(() => this.dataSignal()?.updatedAt ?? null);

  // ----- My Requests sections -----
  readonly awaitingCases = computed<SpecialistCase[]>(() =>
    this.cases().filter(
      (c) => c.requestStatus === 'PROPOSAL_RECEIVED' || c.requestStatus === 'AWAITING_RESPONSE',
    ),
  );
  readonly inProgressCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.requestStatus === 'ACCEPTED' && c.fieldStage !== 'CLOSED'),
  );
  readonly closedDeclinedCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.requestStatus === 'DECLINED' || c.fieldStage === 'CLOSED'),
  );

  readonly sentProposalsCount = computed<number>(() => this.dataSignal()?.awaitingResponseCount ?? 0);
  readonly inProgressCount = computed<number>(() => this.dataSignal()?.inProgressCount ?? 0);
  readonly closedCount = computed<number>(() => this.dataSignal()?.closedCount ?? 0);

  // ----- Field Inspection sections -----
  readonly needsVisitCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.fieldStage === 'NEEDS_VISIT'),
  );
  readonly prescriptionPendingCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.fieldStage === 'FINDINGS_LOGGED'),
  );
  readonly prescribedCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.fieldStage === 'PRESCRIBED'),
  );
  readonly closedFieldCases = computed<SpecialistCase[]>(() =>
    this.cases().filter((c) => c.fieldStage === 'CLOSED'),
  );

  readonly needsVisitCount = computed<number>(() => this.dataSignal()?.needsVisitCount ?? 0);
  readonly prescriptionPendingCount = computed<number>(
    () => this.dataSignal()?.prescriptionPendingCount ?? 0,
  );
  readonly prescribedCount = computed<number>(() => this.dataSignal()?.prescribedCount ?? 0);

  /** Loads the cases once; later mounts reuse the cached read model. */
  load(): void {
    if (this.loadedSignal() || this.loadingSignal()) {
      return;
    }
    this.fetch();
  }

  refresh(): void {
    if (this.loadingSignal()) {
      return;
    }
    this.fetch();
  }

  /**
   * Logs on-site findings for a case. Opens a treatment prescription first when the
   * case has none yet, then reloads so it advances to "Prescription pending".
   */
  logFindings(
    caseItem: SpecialistCase,
    payload: LogFieldInspectionRequest,
    onDone?: (ok: boolean) => void,
  ): void {
    this.submittingSignal.set(true);
    this.ensurePrescription(caseItem)
      .pipe(
        switchMap((prescriptionId) =>
          prescriptionId == null
            ? throwError(() => new Error('No prescription id'))
            : this.api.logFieldInspection(prescriptionId, payload),
        ),
        take(1),
        finalize(() => this.submittingSignal.set(false)),
      )
      .subscribe({
        next: () => {
          this.refresh();
          onDone?.(true);
        },
        error: () => onDone?.(false),
      });
  }

  /**
   * Issues the agrochemical prescription for a case whose findings are logged, then
   * reloads so it advances to "Prescribed · awaiting producer".
   */
  prescribe(
    caseItem: SpecialistCase,
    payload: PrescribeTreatmentRequest,
    onDone?: (ok: boolean) => void,
  ): void {
    if (caseItem.treatmentPrescriptionId == null) {
      onDone?.(false);
      return;
    }
    this.submittingSignal.set(true);
    this.api
      .prescribeTreatment(caseItem.treatmentPrescriptionId, payload)
      .pipe(
        take(1),
        finalize(() => this.submittingSignal.set(false)),
      )
      .subscribe({
        next: () => {
          this.refresh();
          onDone?.(true);
        },
        error: () => onDone?.(false),
      });
  }

  /** Reuses the case's prescription, or opens one from its proposal. */
  private ensurePrescription(caseItem: SpecialistCase): Observable<number | null> {
    if (caseItem.treatmentPrescriptionId != null) {
      return of(caseItem.treatmentPrescriptionId);
    }
    if (caseItem.serviceProposalId == null) {
      return throwError(() => new Error('No proposal to prescribe against'));
    }
    return this.api.createPrescription(caseItem.serviceProposalId);
  }

  private fetch(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(false);
    this.api
      .getCases()
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this.dataSignal.set(data);
          this.loadingSignal.set(false);
          this.loadedSignal.set(true);
        },
        error: () => {
          this.dataSignal.set(null);
          this.errorSignal.set(true);
          this.loadingSignal.set(false);
          this.loadedSignal.set(true);
        },
      });
  }
}
