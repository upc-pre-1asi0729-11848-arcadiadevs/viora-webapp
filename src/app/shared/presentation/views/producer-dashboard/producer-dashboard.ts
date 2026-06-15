import { Component, OnInit, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../../agronomic/application/agronomic.store';

import { OverallPlotHealthCard } from '../../../../agronomic/presentation/components/overall-plot-health-card/overall-plot-health-card';
import { NdviStatusCard } from '../../../../agronomic/presentation/components/ndvi-status-card/ndvi-status-card';
import { ChillAccumulationCard } from '../../../../agronomic/presentation/components/chill-accumulation-card/chill-accumulation-card';
import { YieldForecastCard } from '../../../../agronomic/presentation/components/yield-forecast-card/yield-forecast-card';
import { WeatherSummaryCard } from '../../../../agronomic/presentation/components/weather-summary-card/weather-summary-card';
import { PlotOverviewWidget } from '../../../../agronomic/presentation/components/plot-overview-widget/plot-overview-widget';

import { IotDevicesCard } from '../../../../agronomic/presentation/components/iot-devices-card/iot-devices-card';
import { IotSensorCard } from '../../../../agronomic/presentation/components/iot-sensor-card/iot-sensor-card';

import { TrendAnalysisCard } from '../../../../agronomic/presentation/components/trend-analysis-card/trend-analysis-card';

import { RecentAlertsCard } from '../../../../surveillance/presentation/components/recent-alerts-card/recent-alerts-card';
import { RecommendedActionsCard } from '../../../../surveillance/presentation/components/recommended-actions-card/recommended-actions-card';

import {
  DashboardBreadcrumbItem,
  DashboardHeader
} from '../../components/dashboard-header/dashboard-header';
import {
  DashboardScopeOption,
  DashboardToolbar,
  DashboardToolbarViewOption
} from '../../components/dashboard-toolbar/dashboard-toolbar';

@Component({
  selector: 'app-producer-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    OverallPlotHealthCard,
    NdviStatusCard,
    ChillAccumulationCard,
    YieldForecastCard,
    WeatherSummaryCard,
    PlotOverviewWidget,
    IotDevicesCard,
    IotSensorCard,
    TrendAnalysisCard,
    RecentAlertsCard,
    RecommendedActionsCard,
    DashboardHeader,
    DashboardToolbar,
    TranslatePipe
  ],
  templateUrl: './producer-dashboard.html',
  styleUrl: './producer-dashboard.css'
})
export class ProducerDashboard implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  protected readonly store = inject(AgronomicStore);

  ngOnInit(): void {
    // The store is a session-wide cache. Only do the heavy initial load when we
    // have nothing yet; on later returns (e.g. back from Plot Overview) we keep
    // showing the cached data instead of re-firing every request and flashing
    // empty cards while the slow endpoints respond. Use the header refresh
    // button for an explicit reload.
    if (!this.store.plotsLoaded()) {
      this.refreshDashboardData();
    }
  }

  protected refreshDashboardData(): void {
    this.store.refreshDashboardData();
  }

  protected updatedAgoLabel(): string {
    const updatedAtCandidates = [
      this.store.monitoringSummary()?.updatedAtDate,
      this.store.weatherSummary()?.updatedAtDate
    ].filter((date): date is Date => Boolean(date));

    if (updatedAtCandidates.length === 0) {
      return 'No sync yet';
    }

    const updatedAt = new Date(Math.max(...updatedAtCandidates.map(date => date.getTime())));

    const diffInMinutes = Math.max(
      0,
      Math.round((Date.now() - updatedAt.getTime()) / 60000)
    );

    if (diffInMinutes < 1) {
      return 'just now';
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.round(diffInMinutes / 60);

    if (diffInHours < 24) {
      return `${diffInHours} h ago`;
    }

    const diffInDays = Math.round(diffInHours / 24);

    return `${diffInDays} days ago`;
  }

  protected readonly dashboardScopeOptions = computed<DashboardScopeOption[]>(() => [
    {
      value: 'all',
      label: 'All Plots',
      labelKey: 'dashboard.scope.allPlots',
      badge: this.store.plots().length
    },
    ...this.store.plots().map(plot => ({
      value: plot.id ?? '',
      label: plot.name
    }))
  ]);

  protected readonly dashboardToolbarViewOptions: DashboardToolbarViewOption[] = [
    {
      id: 'iot-devices',
      label: 'IoT Devices',
      labelKey: 'toolbar.iotDevices',
      icon: 'memory',
      route: '/agronomic/iot-devices'
    },
    {
      id: 'plot-overview',
      label: 'Plot Overview',
      labelKey: 'toolbar.plotOverview',
      icon: 'map'
    },
    {
      id: 'weather',
      label: 'Weather',
      labelKey: 'toolbar.weather',
      icon: 'cloud'
    }
  ];

  protected readonly dashboardBreadcrumbs = computed<DashboardBreadcrumbItem[]>(() => {
    const scope = this.store.selectedDashboardScope();
    const selectedPlot = scope === 'all'
      ? null
      : this.store.plots().find(item => String(item.id) === String(scope));

    return [
      {
        label: 'Dashboard',
        labelKey: 'breadcrumbs.dashboard',
        route: '/dashboard',
      },
      {
        label: 'Overview',
        labelKey: 'breadcrumbs.overview',
        route: '/dashboard',
      },
      {
        label: selectedPlot?.name ?? 'All plots',
        labelKey: selectedPlot ? undefined : 'dashboard.scope.allPlots',
        disabled: true,
      },
    ];
  });

  protected onDashboardScopeChange(scope: number | string): void {
    this.store.selectDashboardScope(scope);
  }

  protected onDashboardViewChange(viewId: string): void {
    // Weather opens the dedicated subsection for the active plot.
    if (viewId === 'weather') {
      const plotId = this.store.selectedMapPlotId() ?? this.store.plots()[0]?.id ?? null;

      if (plotId != null) {
        this.router.navigate(['/dashboard/weather', plotId]);
      }

      return;
    }

    const sectionIds: Record<string, string> = {
      'plot-overview': 'plot-overview-section'
    };

    const sectionId = sectionIds[viewId];

    if (!sectionId) {
      return;
    }

    this.document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }

}
