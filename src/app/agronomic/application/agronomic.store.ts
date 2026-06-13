/**
 * Application service store for the `Agronomic` bounded context.
 *
 * Coordinates the Dashboard / Overview use cases against the real Viora Platform
 * backend. The main KPI cards always show *current* figures:
 *  - All Plots scope  -> GET /monitoring-summaries/current
 *  - Single plot scope -> GET /plots/{plotId}/monitoring-summary
 *
 * Historical analysis lives in the Trend Analysis card (statistics series).
 * IoT/plot-health counts come from GET /plots/overview, while the Water Stress
 * sensor cards still use mock telemetry until the backend exposes sensor data.
 *
 * @module AgronomicStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { AgronomicApiService } from '../infrastructure/agronomic-api.service';

import { Plot } from '../domain/model/plot.entity';
import { AgronomicRecord } from '../domain/model/agronomic-record.entity';
import { WeatherSummary } from '../domain/model/weather-summary.entity';
import { YieldForecast } from '../domain/model/yield-forecast.entity';
import { ChillHourRecord } from '../domain/model/chill-hour-record.entity';
import { MonitoringSummary } from '../domain/model/monitoring-summary.entity';
import { OverallPlotHealth } from '../domain/model/overall-plot-health.entity';
import { AgronomicStatistics } from '../domain/model/agronomic-statistics.entity';
import { MyPlotsOverview } from '../domain/model/my-plots-overview.entity';
import { IotDevice } from '../domain/model/iot-device.entity';
import { IotRiskLevel, IotSensorCard } from '../domain/model/iot-device-summary.entity';

export type DashboardScope = number | string;
export type DashboardTimeRange = 'current' | '7days' | '30days';
export type TrendAnalysisTimeRange = '7days' | '30days' | 'campaign';

export interface AgronomicLoadingState {
  plots: boolean;
  overview: boolean;
  weather: boolean;
  summary: boolean;
  statistics: boolean;
  devices: boolean;
  saving: boolean;
  deleting: boolean;
}

/**
 * Reactive store that exposes Agronomic commands and queries.
 */
@Injectable({
  providedIn: 'root',
})
export class AgronomicStore {
  private readonly agronomicApi = inject(AgronomicApiService);


  readonly plots = signal<Plot[]>([]);
  readonly plotsLoaded = signal<boolean>(false);

  readonly selectedDashboardScope = signal<DashboardScope>('all');
  readonly selectedDashboardTimeRange = signal<DashboardTimeRange>('current');
  readonly selectedMapPlotId = signal<number | string | null>(null);
  readonly selectedTrendPlotId = signal<DashboardScope>('all');
  readonly selectedTrendTimeRange = signal<TrendAnalysisTimeRange>('7days');

  readonly monitoringSummary = signal<MonitoringSummary | null>(null);
  readonly plotMonitoringSummary = signal<MonitoringSummary | null>(null);
  readonly weatherSummary = signal<WeatherSummary | null>(null);
  readonly myPlotsOverview = signal<MyPlotsOverview | null>(null);

  readonly summaryLoaded = signal<boolean>(false);

  readonly trendAgronomicStatistics = signal<AgronomicStatistics | null>(null);


  readonly devices = signal<IotDevice[]>([]);
  readonly devicesLoaded = signal<boolean>(false);
  readonly selectedDeviceId = signal<number | string | null>(null);

  readonly errors = signal<unknown[]>([]);

  readonly loading = signal<AgronomicLoadingState>({
    plots: false,
    overview: false,
    weather: false,
    summary: false,
    statistics: false,
    devices: false,
    saving: false,
    deleting: false,
  });


  readonly selectedDashboardPlot = computed<Plot | null>(() => {
    const scope = this.selectedDashboardScope();

    if (scope === 'all') {
      return null;
    }

    return this.plots().find((plot) => String(plot.id) === String(scope)) ?? null;
  });

  readonly selectedMapPlot = computed<Plot | null>(() => {
    const selectedId = this.selectedMapPlotId();

    if (selectedId === null) {
      return null;
    }

    return this.plots().find((plot) => String(plot.id) === String(selectedId)) ?? null;
  });

  readonly selectedPlot = this.selectedMapPlot;

  readonly activeSummary = computed<MonitoringSummary | null>(() => {
    return this.selectedDashboardScope() === 'all'
      ? this.monitoringSummary()
      : this.plotMonitoringSummary();
  });


  readonly latestAgronomicRecord = computed<AgronomicRecord | null>(() => {
    return this.activeSummary()?.latestNdvi ?? null;
  });

  readonly selectedChillHourRecord = computed<ChillHourRecord | null>(() => {
    return this.activeSummary()?.chillHourRecord ?? null;
  });

  readonly selectedYieldForecast = computed<YieldForecast | null>(() => {
    return this.activeSummary()?.yieldForecast ?? null;
  });

  readonly overallPlotHealth = computed<OverallPlotHealth | null>(() => {
    const summary = this.monitoringSummary();
    const overview = this.myPlotsOverview();

    if (!summary && !overview) {
      return null;
    }

    const overviewPlots = overview?.plots ?? [];
    const healthyPlotsCount = overviewPlots.filter(
      (plot) => plot.healthStatus === 'Healthy',
    ).length;
    const reviewPlotsCount = overviewPlots.length - healthyPlotsCount;

    return new OverallPlotHealth({
      status: summary?.overallPlotHealth.status ?? 'Healthy',
      healthyPlotsCount,
      reviewPlotsCount,
    });
  });

  /** Health label for the selected plot (cards source it from the summary). */
  readonly selectedHealthStatusLabel = computed<string>(() => {
    if (this.selectedDashboardScope() === 'all') {
      return '';
    }

    return (
      this.plotMonitoringSummary()?.generalHealthStatus ||
      this.selectedDashboardPlot()?.healthStatus ||
      ''
    );
  });


  readonly selectedMapPlotLatestRecord = computed<AgronomicRecord | null>(() => null);
  readonly selectedPlotLatestRecord = this.selectedMapPlotLatestRecord;

  readonly selectedPlotNdviLabel = computed<string>(() => {
    const plot = this.selectedMapPlot();
    const ndviValue = plot?.currentImagery?.ndviMean ?? 0;

    return ndviValue.toFixed(2);
  });

  readonly selectedPlotLastUpdateLabel = computed<string>(() => {
    const plot = this.selectedMapPlot();
    const timestamp = plot?.lastUpdate ? Date.parse(plot.lastUpdate) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return 'Pending';
    }

    return this.formatRelativeTime(timestamp);
  });


  readonly onlineDevicesCount = computed<number>(() => {
    return this.myPlotsOverview()?.onlineDeviceCountForScope(this.selectedDashboardScope()) ?? 0;
  });

  readonly plotsWithIotCount = computed<number>(() => {
    return this.myPlotsOverview()?.plotsWithIotCount ?? 0;
  });

  readonly lastSyncLabel = computed<string>(() => {
    const lastUpdatedAt = this.myPlotsOverview()?.lastUpdatedAt ?? '';
    const timestamp = lastUpdatedAt ? Date.parse(lastUpdatedAt) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return 'No sync yet';
    }

    return this.formatRelativeSync(timestamp);
  });


  readonly selectedDevice = computed<IotDevice | null>(() => {
    const selectedId = this.selectedDeviceId();

    if (selectedId === null) return null;

    return this.devices().find((device) => String(device.id) === String(selectedId)) ?? null;
  });

  readonly hasDevices = computed<boolean>(() => this.devices().length > 0);

  readonly dashboardScopeDevices = computed<IotDevice[]>(() => {
    return this.getDevicesForScope(this.selectedDashboardScope());
  });

  readonly dashboardInsightCards = computed<IotSensorCard[]>(() => {
    const devices = this.dashboardScopeDevices().filter((device) => device.status !== 'inactive');

    if (devices.length === 0) {
      return [];
    }

    return [this.createSoilMoistureCard(devices), this.createSoilTemperatureCard(devices)];
  });

  readonly plotsCount = computed<number>(() => (this.plotsLoaded() ? this.plots().length : 0));

  readonly hasErrors = computed<boolean>(() => this.errors().length > 0);

  /** Loads (or reloads) every Dashboard / Overview data source. */
  refreshDashboardData(): void {
    this.fetchPlots();
    this.fetchMyPlotsOverview();
    this.fetchDevices();
    this.loadScopeData(this.selectedDashboardScope());
    this.fetchTrendStatistics(this.selectedTrendPlotId(), this.selectedTrendTimeRange());
  }

  /** Loads the current monitoring summary + weather for the given scope. */
  private loadScopeData(scope: DashboardScope): void {
    if (scope === 'all') {
      this.plotMonitoringSummary.set(null);
      this.fetchCurrentMonitoringSummary();
      return;
    }

    this.fetchPlotMonitoringSummary(scope);
    this.fetchPlotWeatherForecast(scope);
  }

  /** Loads the producer's plots together with current imagery. */
  fetchPlots(): void {
    this.setLoading('plots', true);

    this.agronomicApi
      .getPlots()
      .pipe(
        take(1),
        finalize(() => this.setLoading('plots', false)),
      )
      .subscribe({
        next: (plots) => {
          this.plots.set(this.mergePlotHealth(plots, this.myPlotsOverview()));
          this.plotsLoaded.set(true);

          if (plots.length > 0 && this.selectedMapPlotId() === null) {
            this.selectMapPlot(plots[0].id);
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Loads the aggregated overview (real IoT + plot-health counts). */
  fetchMyPlotsOverview(): void {
    this.setLoading('overview', true);

    this.agronomicApi
      .getMyPlotsOverview()
      .pipe(
        take(1),
        finalize(() => this.setLoading('overview', false)),
      )
      .subscribe({
        next: (overview) => {
          this.myPlotsOverview.set(overview);
          this.devicesLoaded.set(true);
          this.plots.update((plots) => this.mergePlotHealth(plots, overview));
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Loads the All Plots current monitoring summary (and its weather snapshot). */
  fetchCurrentMonitoringSummary(): void {
    this.setLoading('summary', true);

    this.agronomicApi
      .getCurrentMonitoringSummary()
      .pipe(
        take(1),
        finalize(() => this.setLoading('summary', false)),
      )
      .subscribe({
        next: (summary) => {
          this.monitoringSummary.set(summary);
          this.summaryLoaded.set(Boolean(summary));

          if (this.selectedDashboardScope() === 'all') {
            this.weatherSummary.set(summary?.weather ?? null);
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Loads the current monitoring summary for a single plot. */
  fetchPlotMonitoringSummary(plotId: DashboardScope): void {
    this.setLoading('summary', true);

    this.agronomicApi
      .getPlotMonitoringSummary(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('summary', false)),
      )
      .subscribe({
        next: (summary) => {
          this.plotMonitoringSummary.set(summary);

          if (
            String(this.selectedDashboardScope()) === String(plotId) &&
            summary?.weather &&
            !this.weatherSummary()
          ) {
            this.weatherSummary.set(summary.weather);
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  fetchPlotWeatherForecast(plotId: DashboardScope): void {
    this.setLoading('weather', true);

    this.agronomicApi
      .getPlotWeatherForecast(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('weather', false)),
      )
      .subscribe({
        next: (weather) => {
          if (weather && String(this.selectedDashboardScope()) === String(plotId)) {
            this.weatherSummary.set(weather);
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  fetchTrendStatistics(
    plotId: DashboardScope = this.selectedTrendPlotId(),
    timeRange: TrendAnalysisTimeRange = this.selectedTrendTimeRange(),
  ): void {
    this.setLoading('statistics', true);

    this.agronomicApi
      .getAgronomicStatisticsSeries(plotId, timeRange)
      .pipe(
        take(1),
        finalize(() => this.setLoading('statistics', false)),
      )
      .subscribe({
        next: (statistics) => this.trendAgronomicStatistics.set(statistics),
        error: (error) => this.registerError(error),
      });
  }

  selectDashboardScope(scope: DashboardScope): void {
    this.selectedDashboardScope.set(scope);
    this.plotMonitoringSummary.set(null);
    this.weatherSummary.set(null);

    if (scope === 'all') {
      this.weatherSummary.set(this.monitoringSummary()?.weather ?? null);
    }

    this.loadScopeData(scope);
  }

  selectMapPlot(id: number | string | null): void {
    this.selectedMapPlotId.set(id);
  }

  selectPlot(id: number | string | null): void {
    this.selectMapPlot(id);
  }

  selectTrendPlot(id: DashboardScope): void {
    this.selectedTrendPlotId.set(id);
    this.trendAgronomicStatistics.set(null);
    this.fetchTrendStatistics(id, this.selectedTrendTimeRange());
  }

  selectTrendTimeRange(timeRange: TrendAnalysisTimeRange): void {
    this.selectedTrendTimeRange.set(timeRange);
    this.trendAgronomicStatistics.set(null);
    this.fetchTrendStatistics(this.selectedTrendPlotId(), timeRange);
  }

  /** Retained for compatibility; the main cards no longer filter by time. */
  selectDashboardTimeRange(timeRange: DashboardTimeRange): void {
    this.selectedDashboardTimeRange.set(timeRange);
  }


  fetchDevices(): void {
    this.setLoading('devices', true);

    this.agronomicApi
      .getIotDevices()
      .pipe(
        take(1),
        finalize(() => this.setLoading('devices', false)),
      )
      .subscribe({
        next: (devices) => {
          this.devices.set(devices);
          this.devicesLoaded.set(true);
        },
        error: (error) => this.registerError(error),
      });
  }

  fetchDeviceById(id: number | string): void {
    this.selectedDeviceId.set(id);

    this.agronomicApi
      .getIotDeviceById(id)
      .pipe(take(1))
      .subscribe({
        next: (device) => {
          this.devices.update((devices) => {
            const exists = devices.some((item) => String(item.id) === String(device.id));

            return exists
              ? devices.map((item) => (String(item.id) === String(device.id) ? device : item))
              : [...devices, device];
          });
        },
        error: (error) => this.registerError(error),
      });
  }

  addDevice(device: IotDevice, onSuccess?: () => void): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .createIotDevice(device)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: (createdDevice) => {
          this.devices.update((devices) => [...devices, createdDevice]);
          onSuccess?.();
        },
        error: (error) => this.registerError(error),
      });
  }

  updateDevice(device: IotDevice, onSuccess?: () => void): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .updateIotDevice(device)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: (updatedDevice) => {
          this.devices.update((devices) =>
            devices.map((item) =>
              String(item.id) === String(updatedDevice.id) ? updatedDevice : item,
            ),
          );

          onSuccess?.();
        },
        error: (error) => this.registerError(error),
      });
  }

  deleteDevice(id: number | string): void {
    this.setLoading('deleting', true);

    this.agronomicApi
      .deleteIotDevice(id)
      .pipe(
        take(1),
        finalize(() => this.setLoading('deleting', false)),
      )
      .subscribe({
        next: () => {
          this.devices.update((devices) =>
            devices.filter((device) => String(device.id) !== String(id)),
          );
        },
        error: (error) => this.registerError(error),
      });
  }

  getDeviceById(id: number | string): IotDevice | null {
    return this.devices().find((device) => String(device.id) === String(id)) ?? null;
  }

  getDevicesForScope(scope: DashboardScope): IotDevice[] {
    if (scope === 'all') {
      return this.devices();
    }

    return this.devices().filter((device) => String(device.plotId) === String(scope));
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  /**
   * Enriches plots (whose `/plots` payload omits health) with the per-plot
   * health status reported by the overview, so the map widget and cards align.
   */
  private mergePlotHealth(plots: Plot[], overview: MyPlotsOverview | null): Plot[] {
    if (!overview) {
      return plots;
    }

    const healthById = new Map(
      overview.plots.map((plot) => [String(plot.id), plot.healthStatus] as const),
    );

    return plots.map((plot) => {
      const healthStatus = healthById.get(String(plot.id));

      if (!healthStatus || healthStatus === plot.healthStatus) {
        return plot;
      }

      return new Plot({
        id: plot.id,
        name: plot.name,
        polygonCoordinates: plot.polygonCoordinates,
        areaSize: plot.areaSize,
        lastUpdate: plot.lastUpdate,
        currentImagery: plot.currentImagery,
        healthStatus,
        phenologicalRisk: plot.phenologicalRisk,
      });
    });
  }

  private formatRelativeTime(timestamp: number): string {
    const diffInMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

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

  private formatRelativeSync(timestamp: number): string {
    return `Last sync: ${this.formatRelativeTime(timestamp)}`;
  }

  private createSoilMoistureCard(devices: IotDevice[]): IotSensorCard {
    const averageValue = this.average(devices.map((device) => device.soilMoisture));
    const riskLevel = this.highestRisk(
      devices.map((device) => this.getSoilMoistureRisk(device.soilMoisture)),
    );

    return new IotSensorCard({
      id: 'water-stress-soil-moisture',
      title: 'Water Stress',
      sourceLabel: 'IoT',
      metricLabel: 'Soil moisture',
      metricValue: averageValue,
      metricUnit: '%',
      trend: riskLevel === 'High' ? 'down' : 'stable',
      riskLevel,
      recommendation: this.getSoilMoistureRecommendation(riskLevel),
    });
  }

  private createSoilTemperatureCard(devices: IotDevice[]): IotSensorCard {
    const averageValue = this.average(devices.map((device) => device.temperature));
    const riskLevel = this.highestRisk(
      devices.map((device) => this.getSoilTemperatureRisk(device.temperature)),
    );

    return new IotSensorCard({
      id: 'water-stress-soil-temperature',
      title: 'Water Stress',
      sourceLabel: 'IoT',
      metricLabel: 'Soil temperature',
      metricValue: averageValue,
      metricUnit: '°C',
      trend: riskLevel === 'High' ? 'up' : 'stable',
      riskLevel,
      recommendation: this.getSoilTemperatureRecommendation(riskLevel),
    });
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);

    return Math.round(total / values.length);
  }

  private getSoilMoistureRisk(value: number): IotRiskLevel {
    if (value < 20) {
      return 'High';
    }

    if (value <= 35) {
      return 'Medium';
    }

    return 'Low';
  }

  private getSoilTemperatureRisk(value: number): IotRiskLevel {
    if (value > 30) {
      return 'High';
    }

    if (value >= 25) {
      return 'Medium';
    }

    return 'Low';
  }

  private highestRisk(riskLevels: IotRiskLevel[]): IotRiskLevel {
    const riskWeight: Record<IotRiskLevel, number> = {
      Low: 1,
      Medium: 2,
      High: 3,
    };

    return riskLevels.sort((first, second) => riskWeight[second] - riskWeight[first]).at(0) ?? 'Low';
  }

  private getSoilMoistureRecommendation(riskLevel: IotRiskLevel): string {
    if (riskLevel === 'High') {
      return 'Irrigation attention required.';
    }

    if (riskLevel === 'Medium') {
      return 'Monitor soil moisture trend.';
    }

    return 'Moisture conditions are stable.';
  }

  private getSoilTemperatureRecommendation(riskLevel: IotRiskLevel): string {
    if (riskLevel === 'High') {
      return 'Temperature may increase water stress.';
    }

    if (riskLevel === 'Medium') {
      return 'Watch temperature exposure.';
    }

    return 'Temperature is within expected range.';
  }

  private setLoading(key: keyof AgronomicLoadingState, value: boolean): void {
    this.loading.update((state) => ({
      ...state,
      [key]: value,
    }));
  }

  private registerError(error: unknown): void {
    this.errors.update((errors) => [...errors, error]);
  }
}
