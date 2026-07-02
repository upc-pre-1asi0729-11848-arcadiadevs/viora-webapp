import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';
import { SurveillanceStore } from '../../../../surveillance/application/surveillance.store';
import { SurveillanceApiService } from '../../../../surveillance/infrastructure/surveillance-api.service';
import { Alert, AlertSeverity } from '../../../../surveillance/domain/model/alert.entity';

import { InterventionsStore } from '../../../application/interventions.store';
import {
  ExecutionStatus,
  ImpactLevel,
  Intervention,
  ObservedResult,
  ServiceResult,
} from '../../../domain/model/intervention-summary.entity';

const ALL_PLOTS = 'all';

@Component({
  selector: 'app-interventions-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader],
  templateUrl: './interventions-overview.html',
  styleUrl: './interventions-overview.css',
})
export class InterventionsOverviewView implements OnInit {
  protected readonly store = inject(InterventionsStore);
  private readonly surveillance = inject(SurveillanceStore);
  private readonly surveillanceApi = inject(SurveillanceApiService);
  private readonly agronomicApi = inject(AgronomicApiService);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Interventions', disabled: true },
    { label: 'Overview', disabled: true },
  ];

  protected readonly plots = signal<Plot[]>([]);
  protected readonly selectedScope = signal<number | string>(ALL_PLOTS);

  // ----- Modal state -----
  protected readonly modal = signal<'certify' | 'impact' | 'close' | null>(null);

  // Certify form
  protected readonly certArea = signal<string>('');
  protected readonly certStatus = signal<ExecutionStatus>('APPLIED_AS_PRESCRIBED');
  protected readonly certNote = signal<string>('');

  // Impact form
  protected readonly impactResult = signal<ObservedResult>('PEST_PRESSURE_REDUCED');
  protected readonly impactLevel = signal<ImpactLevel>('POSITIVE');
  protected readonly impactAssessment = signal<string>('');

  // Close form
  protected readonly closeResult = signal<ServiceResult>('RESOLVED');
  protected readonly closeHire = signal<'YES' | 'NO'>('YES');
  protected readonly closeFeedback = signal<string>('');

  protected readonly isAllScope = computed<boolean>(() => this.selectedScope() === ALL_PLOTS);

  /** Interventions filtered by the plot scope. */
  protected readonly visibleInterventions = computed<Intervention[]>(() => {
    if (this.isAllScope()) {
      return this.store.interventions();
    }
    return this.store
      .interventions()
      .filter((item) => String(item.plotId) === String(this.selectedScope()));
  });

  protected readonly selected = computed<Intervention | null>(() => this.store.selected());

  protected readonly linkedAlert = computed<Alert | null>(() => {
    const alertId = this.selected()?.alertId ?? null;
    if (alertId == null) {
      return null;
    }
    return this.surveillance.alerts().find((alert) => String(alert.id) === String(alertId)) ?? null;
  });

  ngOnInit(): void {
    if (this.surveillance.alerts().length === 0) {
      this.surveillance.fetchAlerts(50);
    }
    this.agronomicApi.getPlots().subscribe((plots) => this.plots.set(plots));
    this.store.loadInterventions();
  }

  protected refresh(): void {
    this.surveillance.fetchAlerts(50);
    this.store.loadInterventions();
  }

  protected onSelectScope(value: string): void {
    this.selectedScope.set(value);
    // Keep the right-hand detail cards consistent with the plot scope: if the
    // current selection is no longer visible, jump to the first one (or clear).
    const visible = this.visibleInterventions();
    const stillVisible = visible.some((item) => item.code === this.store.selectedCode());
    if (!stillVisible) {
      if (visible.length > 0) {
        this.store.select(visible[0].code);
      } else {
        this.store.clearSelection();
      }
    }
  }

  protected selectIntervention(intervention: Intervention): void {
    this.store.select(intervention.code);
  }

  protected plotName(plotId: number | null): string {
    if (plotId == null) {
      return '—';
    }
    return this.plots().find((plot) => String(plot.id) === String(plotId))?.name ?? `Plot #${plotId}`;
  }

  protected severityClass(severity: AlertSeverity | undefined): string {
    return `severity-${(severity ?? 'Low').toLowerCase()}`;
  }

  /** The primary lifecycle action available for the selected intervention. */
  protected readonly nextAction = computed<'simulate' | 'certify' | 'impact' | 'close' | null>(() => {
    const item = this.selected();
    if (!item) {
      return null;
    }
    if (item.needsPrescription) return 'simulate';
    if (item.needsCertification) return 'certify';
    if (item.inRecovery) return 'impact';
    if (item.readyToClose) return 'close';
    return null;
  });

  // ----- Actions -----

  protected simulatePrescription(): void {
    const item = this.selected();
    if (item?.interventionRequestId != null) {
      this.store.simulatePrescription(item.interventionRequestId);
    }
  }

  protected openModal(kind: 'certify' | 'impact' | 'close'): void {
    if (kind === 'certify') {
      this.certArea.set('');
      this.certStatus.set('APPLIED_AS_PRESCRIBED');
      this.certNote.set('');
    } else if (kind === 'impact') {
      this.impactResult.set('PEST_PRESSURE_REDUCED');
      this.impactLevel.set('POSITIVE');
      this.impactAssessment.set('');
    } else {
      this.closeResult.set('RESOLVED');
      this.closeHire.set('YES');
      this.closeFeedback.set('');
    }
    this.modal.set(kind);
  }

  protected closeModal(): void {
    this.modal.set(null);
  }

  protected submitCertify(): void {
    const item = this.selected();
    if (item?.treatmentPrescriptionId == null || this.certArea().trim().length === 0) {
      return;
    }
    this.store.certifyApplication(
      {
        treatmentPrescriptionId: item.treatmentPrescriptionId,
        applicationDate: new Date().toISOString(),
        appliedArea: this.certArea().trim(),
        executionStatus: this.certStatus(),
        fieldNote: this.certNote().trim() || undefined,
      },
      (ok) => ok && this.modal.set(null),
    );
  }

  protected submitImpact(): void {
    const item = this.selected();
    if (item?.interventionExecutionId == null || this.impactAssessment().trim().length === 0) {
      return;
    }
    this.store.reportImpact(
      {
        interventionExecutionId: item.interventionExecutionId,
        gracePeriod: '14 days completed',
        observedResult: this.impactResult(),
        impactLevel: this.impactLevel(),
        producerAssessment: this.impactAssessment().trim(),
      },
      (ok) => ok && this.modal.set(null),
    );
  }

  protected submitClose(): void {
    const item = this.selected();
    if (item?.interventionOutcomeId == null) {
      return;
    }
    const alertId = item.alertId;
    const resolvedTheThreat = this.closeResult() === 'RESOLVED';
    this.store.closeIntervention(
      item.interventionOutcomeId,
      {
        serviceResult: this.closeResult(),
        hireAgain: this.closeHire(),
        privateFeedback: this.closeFeedback().trim() || undefined,
      },
      (ok) => {
        if (!ok) {
          return;
        }
        this.modal.set(null);
        // Close the loop back to Surveillance: a RESOLVED service resolves the
        // alert that triggered the whole cycle. Best-effort.
        if (resolvedTheThreat && alertId != null) {
          this.surveillanceApi.resolveAlert(alertId).subscribe({ error: () => undefined });
        }
      },
    );
  }
}
