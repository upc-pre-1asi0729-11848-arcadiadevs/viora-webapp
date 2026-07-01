import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';
import {
  DashboardScopeOption,
  DashboardToolbar,
  DashboardToolbarViewOption,
} from '../../../../shared/presentation/components/dashboard-toolbar/dashboard-toolbar';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';
import { SurveillanceStore } from '../../../../surveillance/application/surveillance.store';
import { Alert, AlertSeverity } from '../../../../surveillance/domain/model/alert.entity';

import { InterventionStore } from '../../../application/intervention.store';
import { SpecialistCandidate } from '../../../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../../../domain/model/intervention-request.entity';

/** Steps of the request expert-assistance flow (inline modal). */
type ModalStep = 'form' | 'success' | null;

@Component({
  selector: 'app-expert-assistance-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader, DashboardToolbar],
  templateUrl: './expert-assistance-overview.html',
  styleUrl: './expert-assistance-overview.css',
})
export class ExpertAssistanceOverviewView implements OnInit {
  protected readonly store = inject(InterventionStore);
  private readonly surveillance = inject(SurveillanceStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly router = inject(Router);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Expert Assistance', disabled: true },
    { label: 'Overview', disabled: true },
  ];

  protected readonly plots = signal<Plot[]>([]);
  protected readonly selectedPlotId = signal<number | string | null>(null);

  // ----- Request modal state -----
  protected readonly modalStep = signal<ModalStep>(null);
  protected readonly modalSpecialist = signal<SpecialistCandidate | null>(null);
  protected readonly formReason = signal<string>('');
  protected readonly formMessage = signal<string>('');
  protected readonly createdRequest = signal<InterventionRequest | null>(null);

  /** The plot currently in scope (Expert Assistance is always per a single plot). */
  protected readonly selectedPlot = computed<Plot | null>(() => {
    const plotId = this.selectedPlotId();
    return this.plots().find((plot) => String(plot.id) === String(plotId)) ?? null;
  });

  /** Highest-severity open alert for the selected plot — the active case. */
  protected readonly activeAlert = computed<Alert | null>(() => {
    const plotId = this.selectedPlotId();
    if (plotId == null) {
      return null;
    }

    const openForPlot = this.surveillance
      .openAlerts()
      .filter((alert) => String(alert.plotId) === String(plotId));

    if (openForPlot.length === 0) {
      return null;
    }

    return [...openForPlot].sort(
      (a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity),
    )[0];
  });

  /** Location · area caption for the active-case card. */
  protected readonly plotSummary = computed<string>(() => {
    const plot = this.selectedPlot();
    if (!plot) {
      return '';
    }
    const location = plot.location || 'Unknown location';
    return `${plot.name} · ${location} · ${plot.areaSizeLabel}`;
  });

  /** Quick-nav buttons for the standardized toolbar (no threats selector). */
  protected readonly toolbarViewOptions = computed<DashboardToolbarViewOption[]>(() => {
    const plotId = this.selectedPlotId();

    return [
      { id: 'dashboard', label: 'Dashboard', labelKey: 'toolbar.dashboard', icon: 'grid_view', route: '/dashboard' },
      { id: 'plot-overview', label: 'Plot Overview', labelKey: 'toolbar.plotOverview', icon: 'map', route: '/agronomic/plots' },
      {
        id: 'weather',
        label: 'Weather',
        labelKey: 'toolbar.weather',
        icon: 'cloud',
        route: plotId != null ? `/dashboard/weather/${plotId}` : '/dashboard',
      },
    ];
  });

  /** Plot scope options — per-plot only, no "All plots" entry. */
  protected readonly scopeOptions = computed<DashboardScopeOption[]>(() =>
    this.plots()
      .filter((plot) => plot.id != null)
      .map((plot) => ({ value: plot.id as number | string, label: plot.name })),
  );

  ngOnInit(): void {
    this.surveillance.fetchAlerts(50);
    this.loadPlots();
  }

  private loadPlots(): void {
    this.agronomicApi.getPlots().subscribe((plots) => {
      this.plots.set(plots);
      const first = plots.find((plot) => plot.id != null);
      if (first && first.id != null) {
        this.selectPlot(first.id);
      }
    });
  }

  protected onSelectPlot(plotId: number | string): void {
    this.selectPlot(plotId);
  }

  private selectPlot(plotId: number | string): void {
    this.selectedPlotId.set(plotId);
    this.store.loadRequests(plotId);

    const alert = this.activeAlert();
    if (alert?.id != null) {
      this.store.loadSpecialists(alert.id);
    }
  }

  protected refresh(): void {
    this.surveillance.fetchAlerts(50);
    const plotId = this.selectedPlotId();
    if (plotId != null) {
      this.store.loadRequests(plotId);
    }
  }

  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /** Opens the case detail for a request from the history table. */
  protected openCase(request: InterventionRequest): void {
    if (request.referenceCode) {
      this.router.navigate(['/assistance/expert-assistance/case', request.referenceCode]);
    }
  }

  /** From the success modal, jumps to the just-created case. */
  protected viewCreatedCase(): void {
    const created = this.createdRequest();
    this.closeModal();
    if (created?.referenceCode) {
      this.router.navigate(['/assistance/expert-assistance/case', created.referenceCode]);
    }
  }

  protected severityClass(severity: AlertSeverity | undefined): string {
    return `severity-${(severity ?? 'Low').toLowerCase()}`;
  }

  protected statusClass(status: InterventionRequest['status']): string {
    switch (status) {
      case 'PROPOSAL_RECEIVED':
      case 'ACCEPTED':
        return 'status-proposal';
      case 'DECLINED':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  }

  protected availabilityClass(specialist: SpecialistCandidate): string {
    return specialist.availability === 'today' ? 'avail-today' : 'avail-soon';
  }

  // ----- Request modal -----

  protected openRequest(specialist: SpecialistCandidate): void {
    const alert = this.activeAlert();
    this.modalSpecialist.set(specialist);
    this.formReason.set(
      alert
        ? `Possible ${alert.typeLabel.toLowerCase()} pattern detected from symptom report and NDVI variation.`
        : 'Field inspection requested based on the selected plot condition.',
    );
    this.formMessage.set('');
    this.createdRequest.set(null);
    this.modalStep.set('form');
  }

  protected closeModal(): void {
    this.modalStep.set(null);
    this.modalSpecialist.set(null);
  }

  protected get canSubmit(): boolean {
    return (
      this.modalSpecialist() != null &&
      this.selectedPlotId() != null &&
      this.activeAlert()?.id != null &&
      this.formReason().trim().length > 0 &&
      !this.store.loading().submitting
    );
  }

  protected submitRequest(): void {
    const specialist = this.modalSpecialist();
    const plotId = this.selectedPlotId();
    const alert = this.activeAlert();

    if (!specialist || specialist.id == null || plotId == null || alert?.id == null) {
      return;
    }

    this.store.submitRequest(
      {
        plotId: Number(plotId),
        specialistId: Number(specialist.id),
        alertId: Number(alert.id),
        reason: this.formReason().trim(),
        message: this.formMessage().trim() || undefined,
      },
      (created) => {
        if (created) {
          this.createdRequest.set(created);
          this.modalStep.set('success');
        }
      },
    );
  }

  private severityWeight(severity: AlertSeverity): number {
    switch (severity) {
      case 'Critical':
        return 4;
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      default:
        return 1;
    }
  }
}
