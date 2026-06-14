import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../../agronomic/application/agronomic.store';

import { OverallPlotHealthCard } from '../../../../agronomic/presentation/components/overall-plot-health-card/overall-plot-health-card';
import { NdviStatusCard } from '../../../../agronomic/presentation/components/ndvi-status-card/ndvi-status-card';
import { ChillAccumulationCard } from '../../../../agronomic/presentation/components/chill-accumulation-card/chill-accumulation-card';
import { YieldForecastCard } from '../../../../agronomic/presentation/components/yield-forecast-card/yield-forecast-card';
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
    IotDevicesCard,
    IotSensorCard,
    WeatherSummaryCard,
    DataFreshnessCard,
    PlotMap,
  ],
  templateUrl: './plot-overview-page.html',
  styleUrl: './plot-overview-page.css',
})
export class PlotOverviewPage implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(AgronomicStore);

  protected readonly selectedPlot = computed(() => this.store.selectedMapPlot());

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Dashboard', labelKey: 'breadcrumbs.dashboard', route: '/dashboard' },
    { label: 'Plot Overview', labelKey: 'breadcrumbs.plotOverview', route: '/dashboard' },
    { label: this.selectedPlot()?.name ?? '—', disabled: true },
  ]);

  ngOnInit(): void {
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

  protected scrollToWeather(): void {
    this.document
      .getElementById('weather-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
