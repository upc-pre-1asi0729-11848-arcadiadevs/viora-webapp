import { Component, DestroyRef, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore, DashboardScope } from '../../../../agronomic/application/agronomic.store';

import { OverallPlotHealthCard } from '../../../../agronomic/presentation/components/overall-plot-health-card/overall-plot-health-card';
import { NdviStatusCard } from '../../../../agronomic/presentation/components/ndvi-status-card/ndvi-status-card';
import { ChillAccumulationCard } from '../../../../agronomic/presentation/components/chill-accumulation-card/chill-accumulation-card';
import { YieldForecastCard } from '../../../../agronomic/presentation/components/yield-forecast-card/yield-forecast-card';
import { PhenologicalRiskCard } from '../../../../agronomic/presentation/components/phenological-risk-card/phenological-risk-card';
import { IotDevicesCard } from '../../../../agronomic/presentation/components/iot-devices-card/iot-devices-card';
import { IotSensorCard } from '../../../../agronomic/presentation/components/iot-sensor-card/iot-sensor-card';
import { WeatherSummaryCard } from '../../../../agronomic/presentation/components/weather-summary-card/weather-summary-card';
import { DataFreshnessCard } from '../../../../agronomic/presentation/components/data-freshness-card/data-freshness-card';
import { PlotMap } from '../../../../agronomic/presentation/components/plot-map/plot-map';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../components/dashboard-header/dashboard-header';

@Component({
  selector: 'app-plot-overview-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe,
    DashboardHeader,
    OverallPlotHealthCard,
    NdviStatusCard,
    ChillAccumulationCard,
    YieldForecastCard,
    PhenologicalRiskCard,
    IotDevicesCard,
    IotSensorCard,
    WeatherSummaryCard,
    DataFreshnessCard,
    PlotMap,
  ],
  templateUrl: './plot-overview-page.html',
  styleUrl: './plot-overview-page.css',
})
export class PlotOverviewPage implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(AgronomicStore);

  /**
   * Dashboard scope active when this page was opened. The page repurposes the
   * shared scope to drive the reused KPI cards for a single plot, so we restore
   * it on leave; otherwise the main dashboard would come back pointing at this
   * plot (with its per-plot summary briefly null) and flash empty cards.
   */
  private scopeOnEntry: DashboardScope | null = null;

  protected readonly selectedPlot = computed(() => this.store.selectedMapPlot());

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Dashboard', labelKey: 'breadcrumbs.dashboard', route: '/dashboard' },
    { label: 'Plot Overview', labelKey: 'breadcrumbs.plotOverview', route: '/dashboard' },
    { label: this.selectedPlot()?.name ?? '—', disabled: true },
  ]);

  ngOnInit(): void {
    this.scopeOnEntry = this.store.selectedDashboardScope();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const plotId = params.get('plotId');

      if (!plotId) {
        return;
      }

      this.store.selectMapPlot(plotId);
      this.store.selectDashboardScope(plotId);

      if (this.store.plots().length === 0) {
        this.store.refreshDashboardData();
      }
    });
  }

  ngOnDestroy(): void {
    // Leave the shared scope as we found it so the dashboard restores instantly
    // from its cached "all plots" data instead of re-loading this single plot.
    if (this.scopeOnEntry !== null) {
      this.store.selectDashboardScope(this.scopeOnEntry);
    }
  }

  protected updatedLabel(): string {
    const candidates = [
      this.store.plotMonitoringSummary()?.updatedAtDate,
      this.store.weatherSummary()?.updatedAtDate,
    ].filter((date): date is Date => Boolean(date));

    if (candidates.length === 0) {
      return 'No sync yet';
    }

    const updatedAt = Math.max(...candidates.map((date) => date.getTime()));
    const minutes = Math.max(0, Math.round((Date.now() - updatedAt) / 60000));

    if (minutes < 1) {
      return 'just now';
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);

    return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
  }

  protected refresh(): void {
    this.store.refreshDashboardData();
  }

  protected onPlotSelected(event: MatSelectChange): void {
    this.router.navigate(['/dashboard/plot-overview', event.value]);
  }

  /**
   * Compares plot ids by value across types. The route param arrives as a
   * string while `plot.id` is numeric, so the default strict equality never
   * matches and the select renders empty; normalising to string fixes the
   * trigger so it shows the active plot name.
   */
  protected comparePlotId = (a: unknown, b: unknown): boolean =>
    a != null && b != null && String(a) === String(b);

  protected scrollToWeather(): void {
    this.document
      .getElementById('weather-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
