import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

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

import { SurveillanceStore } from '../../../application/surveillance.store';
import { PestReport, RiskZone } from '../../../domain/model/pest-report.entity';
import { AlertSeverity } from '../../../domain/model/alert.entity';
import {
  LngLat,
  SurveillanceMap,
  SurveillanceMapMarker,
} from '../../components/surveillance-map/surveillance-map';

/** Signal-source filter for the surveillance map. */
type MapFilter = 'all' | 'manual' | 'satellite' | 'community' | 'autonomous';

/** A mocked autonomous detection (no backend feed yet). */
interface AutonomousDetection {
  title: string;
  plotLabel: string;
  description: string;
  severity: AlertSeverity;
}

@Component({
  selector: 'app-pest-surveillance-overview',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    DashboardHeader,
    DashboardToolbar,
    SurveillanceMap,
    TranslatePipe,
  ],
  templateUrl: './pest-surveillance-overview.html',
  styleUrl: './pest-surveillance-overview.css',
})
export class PestSurveillanceOverviewView implements OnInit {
  protected readonly store = inject(SurveillanceStore);
  private readonly router = inject(Router);
  private readonly agronomicApi = inject(AgronomicApiService);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Pest Surveillance', labelKey: 'pestPage.breadcrumb.pestSurveillance', disabled: true },
    { label: 'Overview', labelKey: 'pestPage.breadcrumb.overview', disabled: true },
  ];

  protected readonly plots = signal<Plot[]>([]);
  protected readonly selectedPlotId = signal<number | string | null>(null);

  protected readonly mapFilter = signal<MapFilter>('all');
  protected readonly mapFilters: { id: MapFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'pestPage.mapFilters.all' },
    { id: 'manual', labelKey: 'pestPage.mapFilters.manual' },
    { id: 'satellite', labelKey: 'pestPage.mapFilters.satellite' },
    { id: 'community', labelKey: 'pestPage.mapFilters.community' },
    { id: 'autonomous', labelKey: 'pestPage.mapFilters.autonomous' },
  ];

  protected readonly riskZones: RiskZone[] = ['FULL_PLOT', 'PARTIAL_PLOT', 'EDGES'];
  protected readonly severities: AlertSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

  // ----- Report form state -----
  protected readonly formOpen = signal<boolean>(false);
  protected readonly formPlotId = signal<number | string | null>(null);
  protected readonly formRiskZone = signal<RiskZone>('FULL_PLOT');
  protected readonly formSeverity = signal<AlertSeverity>('Medium');
  protected readonly formSymptoms = signal<string[]>([]);
  protected readonly formNotes = signal<string>('');

  /** Autonomous detections are not fed by the backend yet (placeholder). */
  protected readonly autonomousDetections: AutonomousDetection[] = [
    {
      title: 'Persistent low-vigor zone',
      plotLabel: 'Satellite',
      description: 'NDVI remained below expected range for 3 consecutive updates.',
      severity: 'Medium',
    },
    {
      title: 'Low-vigor cluster near boundary',
      plotLabel: 'Satellite',
      description: 'Vegetation vigor decreased in the south-west block.',
      severity: 'Medium',
    },
    {
      title: 'Community pattern detected',
      plotLabel: 'Satellite',
      description: 'Nearby signals suggest preventive monitoring is advised.',
      severity: 'Low',
    },
  ];

  /** Reports submitted for the currently selected plot. */
  protected readonly reportsForSelectedPlot = computed<PestReport[]>(() => {
    const plotId = this.selectedPlotId();
    return this.store.pestReports().filter((report) => String(report.plotId) === String(plotId));
  });

  /** Boundary ([lng,lat]) of the selected plot for the map. */
  protected readonly selectedBoundary = computed<LngLat[]>(() => {
    const plotId = this.selectedPlotId();
    const plot = this.plots().find((candidate) => String(candidate.id) === String(plotId));
    return (plot?.polygonCoordinates ?? []) as LngLat[];
  });

  /**
   * Markers placed on the plot map, honoring the active source filter. Only
   * reports that still represent active risk are shown as signals — a confirmed
   * report whose alert has been resolved/dismissed (or an archived report) is no
   * longer an active signal.
   */
  protected readonly mapMarkers = computed<SurveillanceMapMarker[]>(() => {
    const filter = this.mapFilter();

    // Reports are "Manual" signals; other sources have no backend feed yet.
    if (filter !== 'all' && filter !== 'manual') {
      return [];
    }

    const plotId = this.selectedPlotId();
    return this.store
      .activeConfirmedReports()
      .filter((report) => String(report.plotId) === String(plotId))
      .map((report) => ({
        id: report.code,
        title: `Manual report · ${report.symptomsLabel || 'symptoms'} · ${report.observedSeverity}`,
        severity: report.observedSeverity,
        riskZone: report.riskZone,
      }));
  });

  protected readonly activeSignalsCount = computed<number>(() => this.mapMarkers().length);

  protected readonly plotsMonitored = computed<number>(() => this.plots().length);

  /** Quick-nav view buttons for the standardized toolbar. */
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

  /** Plot scope options for the toolbar's selector. */
  protected readonly scopeOptions = computed<DashboardScopeOption[]>(() =>
    this.plots()
      .filter((plot) => plot.id != null)
      .map((plot) => ({ value: plot.id as number | string, label: plot.name })),
  );

  ngOnInit(): void {
    this.store.loadPestReports();
    this.store.loadSymptoms();
    // Active signals depend on which reports still have an OPEN alert.
    this.store.fetchAlerts(50);
    this.loadPlots();
  }

  protected refresh(): void {
    this.store.loadPestReports();
    this.store.fetchAlerts(50);
    const plotId = this.selectedPlotId();
    if (plotId != null) {
      this.store.loadCommunityRisk(plotId, 5);
    }
  }

  private loadPlots(): void {
    this.agronomicApi.getPlots().subscribe((plots) => {
      this.plots.set(plots);

      const first = plots[0];
      if (first && first.id != null) {
        this.selectedPlotId.set(first.id);
        this.formPlotId.set(first.id);
        this.store.pestScopePlotId.set(first.id);
        this.store.loadCommunityRisk(first.id, 5);
      }
    });
  }

  protected onSelectPlot(plotId: number | string): void {
    this.selectedPlotId.set(plotId);
    this.store.pestScopePlotId.set(plotId);
    this.store.loadCommunityRisk(plotId, 5);
  }

  protected setMapFilter(filter: MapFilter): void {
    this.mapFilter.set(filter);
  }

  /** Resolves a plot id to its name for the report-history table. */
  protected plotName(plotId: number | null): string {
    const plot = this.plots().find((candidate) => String(candidate.id) === String(plotId));
    return plot?.name ?? `Plot ${plotId ?? ''}`;
  }

  protected resultClass(result: PestReport['result']): string {
    switch (result) {
      case 'Alert confirmed':
        return 'result-confirmed';
      case 'Under review':
        return 'result-review';
      default:
        return 'result-archived';
    }
  }

  protected severityClass(severity: AlertSeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // ----- Report form -----

  protected openReportForm(): void {
    this.formPlotId.set(this.selectedPlotId());
    this.formRiskZone.set('FULL_PLOT');
    this.formSeverity.set('Medium');
    this.formSymptoms.set([]);
    this.formNotes.set('');
    this.formOpen.set(true);
  }

  protected closeReportForm(): void {
    this.formOpen.set(false);
  }

  protected toggleSymptom(id: string): void {
    this.formSymptoms.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  protected isSymptomSelected(id: string): boolean {
    return this.formSymptoms().includes(id);
  }

  protected get canSubmit(): boolean {
    return (
      this.formPlotId() != null &&
      this.formSymptoms().length > 0 &&
      !this.store.loading().submitting
    );
  }

  protected submitReport(): void {
    const plotId = this.formPlotId();

    if (plotId == null || this.formSymptoms().length === 0) {
      return;
    }

    this.store.submitReport(
      {
        plotId: Number(plotId),
        riskZone: this.formRiskZone(),
        symptoms: this.formSymptoms(),
        observedSeverity: this.formSeverity().toUpperCase(),
        notes: this.formNotes(),
      },
      (success) => {
        if (success) {
          this.closeReportForm();
        }
      },
    );
  }
}
