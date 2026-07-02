/**
 * Application store for the Interventions section — the technical-service lifecycle
 * downstream of Expert Assistance (prescription → certify → recovery → impact →
 * close). All data is real (composed backend read model + action endpoints).
 *
 * @module InterventionsStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, forkJoin, Observable, take } from 'rxjs';

import { InterventionApiService } from '../infrastructure/intervention-api.service';
import { PrescriptionView } from '../infrastructure/treatment-prescription-response';
import {
  CertifyApplicationRequest,
  CloseInterventionRequest,
  ReportImpactRequest,
} from '../infrastructure/intervention-lifecycle-requests';
import { Intervention } from '../domain/model/intervention-summary.entity';

@Injectable({
  providedIn: 'root',
})
export class InterventionsStore {
  private readonly api = inject(InterventionApiService);

  readonly interventions = signal<Intervention[]>([]);
  readonly loaded = signal<boolean>(false);
  readonly selectedCode = signal<string | null>(null);
  readonly prescription = signal<PrescriptionView | null>(null);
  readonly specialistNames = signal<Record<number, string>>({});

  readonly loading = signal<{ list: boolean; action: boolean }>({ list: false, action: false });
  readonly lastSyncedAt = signal<number | null>(null);

  readonly selected = computed<Intervention | null>(
    () => this.interventions().find((item) => item.code === this.selectedCode()) ?? null,
  );

  readonly totalAmount = computed<number>(() =>
    this.interventions().reduce((sum, item) => sum + (item.amount ?? 0), 0),
  );
  readonly pendingCertificationCount = computed<number>(() => this.countByStatus('PRESCRIPTION_ISSUED'));
  readonly recoveryMonitoringCount = computed<number>(() => this.countByStatus('RECOVERY_MONITORING'));
  readonly closurePendingCount = computed<number>(() => this.countByStatus('READY_TO_CLOSE'));

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

  /** Loads the grower's interventions, keeping/adopting a selection and its prescription. */
  loadInterventions(): void {
    this.setLoading('list', true);
    this.api
      .getInterventions()
      .pipe(
        take(1),
        finalize(() => this.setLoading('list', false)),
      )
      .subscribe({
        next: (interventions) => {
          this.interventions.set(interventions);
          this.loaded.set(true);
          this.lastSyncedAt.set(Date.now());

          const stillSelected = interventions.some((item) => item.code === this.selectedCode());
          if (!stillSelected) {
            this.selectedCode.set(interventions[0]?.code ?? null);
          }
          this.loadPrescriptionFor(this.selected());
          this.loadSpecialistNames(interventions);
        },
        error: () => undefined,
      });
  }

  select(code: string): void {
    this.selectedCode.set(code);
    this.loadPrescriptionFor(this.selected());
  }

  /** Clears the current selection (used when the plot scope has no interventions). */
  clearSelection(): void {
    this.selectedCode.set(null);
    this.prescription.set(null);
  }

  /** Resolves a specialist display name from the loaded profile map. */
  specialistName(specialistId: number | null): string {
    if (specialistId == null) {
      return '—';
    }
    return this.specialistNames()[specialistId] ?? `Specialist #${specialistId}`;
  }

  simulatePrescription(requestId: number, onDone?: (ok: boolean) => void): void {
    this.runAction(this.api.simulatePrescription(requestId), onDone);
  }

  certifyApplication(request: CertifyApplicationRequest, onDone?: (ok: boolean) => void): void {
    this.runAction(this.api.certifyApplication(request), onDone);
  }

  reportImpact(request: ReportImpactRequest, onDone?: (ok: boolean) => void): void {
    this.runAction(this.api.reportImpact(request), onDone);
  }

  closeIntervention(
    outcomeId: number,
    request: CloseInterventionRequest,
    onDone?: (ok: boolean) => void,
  ): void {
    this.runAction(this.api.closeIntervention(outcomeId, request), onDone);
  }

  private runAction(action$: Observable<unknown>, onDone?: (ok: boolean) => void): void {
    this.setLoading('action', true);
    action$
      .pipe(
        take(1),
        finalize(() => this.setLoading('action', false)),
      )
      .subscribe({
        next: () => {
          this.loadInterventions();
          onDone?.(true);
        },
        error: () => onDone?.(false),
      });
  }

  private loadPrescriptionFor(intervention: Intervention | null): void {
    const prescriptionId = intervention?.treatmentPrescriptionId ?? null;
    if (prescriptionId == null) {
      this.prescription.set(null);
      return;
    }
    this.api
      .getPrescription(prescriptionId)
      .pipe(take(1))
      .subscribe({
        next: (view) => this.prescription.set(view),
        error: () => this.prescription.set(null),
      });
  }

  private loadSpecialistNames(interventions: Intervention[]): void {
    const ids = [
      ...new Set(
        interventions
          .map((item) => item.specialistId)
          .filter((id): id is number => id != null),
      ),
    ].filter((id) => this.specialistNames()[id] == null);

    if (ids.length === 0) {
      return;
    }

    forkJoin(ids.map((id) => this.api.getSpecialistProfile(id)))
      .pipe(take(1))
      .subscribe({
        next: (profiles) => {
          this.specialistNames.update((names) => {
            const next = { ...names };
            profiles.forEach((profile) => {
              if (profile.id != null) {
                next[profile.id] = profile.fullName || `Specialist #${profile.id}`;
              }
            });
            return next;
          });
        },
        error: () => undefined,
      });
  }

  private countByStatus(status: Intervention['status']): number {
    return this.interventions().filter((item) => item.status === status).length;
  }

  private setLoading(key: 'list' | 'action', value: boolean): void {
    this.loading.update((state) => ({ ...state, [key]: value }));
  }
}
