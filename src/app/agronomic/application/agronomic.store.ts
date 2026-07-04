/**
 * Application service store for the `Agronomic` bounded context.
 *
 *
 * @module AgronomicStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subscription, finalize, take } from 'rxjs';

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
import { PlotRegistration } from '../domain/model/plot-registration.entity';
import { PlotDetail } from '../domain/model/plot-detail.entity';
import { DynamicNutritionPlan } from '../domain/model/dynamic-nutrition-plan.entity';
import { CertifyNutritionPlanResource } from '../infrastructure/dynamic-nutrition-plan-response';
import { IotDevice } from '../domain/model/iot-device.entity';
import { IotRiskLevel, IotSensorCard } from '../domain/model/iot-device-summary.entity';
import {
  CreatePlotResource,
  UpdatePlotResource,
} from '../infrastructure/plot-registration-response';

/** Create Plot wizard payload (userId is injected by the API service). */
export type CreatePlotRequest = Omit<CreatePlotResource, 'userId'>;

/** Edit Plot payload — partial; omitted fields are kept by the backend. */
export type UpdatePlotRequest = UpdatePlotResource;

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
  detail: boolean;
  nutrition: boolean;
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
  readonly lastPlotRegistration = signal<PlotRegistration | null>(null);
  readonly plotDetail = signal<PlotDetail | null>(null);
  readonly activeNutritionPlan = signal<DynamicNutritionPlan | null>(null);

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
    detail: false,
    nutrition: false,
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
    const summaryRecord = this.activeSummary()?.latestNdvi ?? null;

    if (summaryRecord && summaryRecord.ndviIndex > 0) {
      return summaryRecord;
    }

    // Single-plot scope whose slow monitoring summary hasn't landed yet: fill
    // NDVI from the imagery we already loaded with `/plots` (same source the
    // Plot Overview widget uses), so the card shows instantly. The summary still
    // refines it (plus chill/yield) once it arrives.
    const plot = this.selectedDashboardScope() === 'all' ? null : this.selectedDashboardPlot();
    const imagery = plot?.currentImagery;

    if (plot && imagery && imagery.ndviMean > 0) {
      return new AgronomicRecord({
        plotId: plot.id,
        date: imagery.captureDate || plot.lastUpdate,
        ndviIndex: imagery.ndviMean,
        ndviTrend: 'stable',
        ndviStatusLabel: plot.healthStatus,
      });
    }

    return summaryRecord;
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
    return this.getDevicesForScope(this.selectedDashboardScope())
      .filter((device) => device.status !== 'inactive').length;
  });

  readonly plotsWithIotCount = computed<number>(() => {
    return new Set(this.devices().map((device) => String(device.plotId))).size;
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

    const soilMoistureDevices = devices.filter((device) => device.measuresSoilMoisture);
    const soilTemperatureDevices = devices.filter((device) => device.measuresSoilTemperature);
    const leafHumidityDevices = devices.filter((device) => device.measuresLeafHumidity);

    const cards: IotSensorCard[] = [];

    if (soilMoistureDevices.length > 0) {
      cards.push(this.createSoilMoistureCard(soilMoistureDevices));
    }

    if (soilTemperatureDevices.length > 0) {
      cards.push(this.createSoilTemperatureCard(soilTemperatureDevices));
    }

    if (leafHumidityDevices.length > 0) {
      cards.push(this.createLeafHumidityCard(leafHumidityDevices));
    }

    return cards;
  });

  readonly plotsCount = computed<number>(() => (this.plotsLoaded() ? this.plots().length : 0));

  /**
   * True once the plots request has resolved AND the account owns no plots.
   * Cards use this as the single source of truth to switch from their loading
   * placeholder to a real empty state, so a brand-new account never sits on
   * "Loading…" forever. While `plotsLoaded()` is still false this stays false,
   * keeping the loading placeholder during the genuine in-flight window.
   */
  readonly hasNoPlots = computed<boolean>(() => this.plotsLoaded() && this.plots().length === 0);

  readonly hasErrors = computed<boolean>(() => this.errors().length > 0);

  /**
   * Minimum gap between on-demand statistic ingestions. The backend already runs
   * a daily scheduled ingestion and throttles AgroMonitoring per plot, so firing
   * an ingest on every dashboard visit is wasteful; we only top it up at most
   * once per window.
   */
  private static readonly STATISTICS_SYNC_COOLDOWN_MS = 30 * 60 * 1000;

  /** Epoch ms of the last on-demand ingestion (0 = never this session). */
  private lastStatisticsSyncAt = 0;

  /**
   * Per-plot caches for the slow on-demand endpoints
   * (`/plots/{id}?view=monitoring` and `?view=weather`). Keyed by
   * `String(plotId)`. Once a plot has been loaded this session, re-selecting it
   * (or returning to the dashboard on that scope) renders instantly from cache
   * and refreshes silently in the background instead of blanking and waiting
   * out the multi-minute server-side recompute. Signals so the Weather page can
   * react as each plot's data lands.
   */
  readonly plotSummaryCache = signal<Record<string, MonitoringSummary>>({});
  readonly plotWeatherCache = signal<Record<string, WeatherSummary>>({});

  /** Plot ids with an in-flight ensure* fetch, to avoid duplicate requests. */
  private readonly ensureInFlight = new Set<string>();

  /**
   * In-flight request per data channel. Each scope-bound fetch cancels the
   * previous request on its channel before issuing a new one (see
   * {@link runExclusive}).
   */
  private readonly inFlightRequests = new Map<keyof AgronomicLoadingState, Subscription>();

  /**
   * Runs a request on a named channel, cancelling any previous in-flight
   * request on the same channel first.
   *
   * Switching plots (or navigating between the dashboard and the plot overview)
   * fires a fresh request on each channel. Without cancellation the superseded
   * requests keep occupying the browser's connection pool (~6 per host) and the
   * slow per-plot monitoring endpoint starves the dashboard reload, leaving the
   * cards stuck on their loading placeholders. Unsubscribing aborts the
   * underlying HTTP request and frees the connection immediately.
   */
  private runExclusive<T>(
    channel: keyof AgronomicLoadingState,
    request$: Observable<T>,
    onNext: (value: T) => void,
  ): void {
    // Abort the previous request on this channel (its finalize clears loading).
    this.inFlightRequests.get(channel)?.unsubscribe();
    this.setLoading(channel, true);

    const subscription = request$
      .pipe(
        take(1),
        finalize(() => this.setLoading(channel, false)),
      )
      .subscribe({
        next: onNext,
        error: (error) => this.registerError(error),
      });

    this.inFlightRequests.set(channel, subscription);
  }

  /** Loads (or reloads) every Dashboard / Overview data source. */
  refreshDashboardData(): void {
    this.fetchPlots();
    this.fetchMyPlotsOverview();
    this.fetchDevices();
    this.loadScopeData(this.selectedDashboardScope());
    this.fetchTrendStatistics(this.selectedTrendPlotId(), this.selectedTrendTimeRange());

    if (!this.shouldSyncStatistics()) {
      return;
    }

    // Pull the latest AgroMonitoring snapshot on demand, then reload the
    // statistic-derived views (monitoring summary + trend) so NDVI/chill/yield
    // populate without waiting for the daily scheduled ingestion.
    this.lastStatisticsSyncAt = Date.now();
    this.syncStatistics(() => {
      this.loadScopeData(this.selectedDashboardScope());
      this.fetchTrendStatistics(this.selectedTrendPlotId(), this.selectedTrendTimeRange());
    });
  }

  /** True when no on-demand ingestion has run within the cooldown window. */
  private shouldSyncStatistics(): boolean {
    return (
      Date.now() - this.lastStatisticsSyncAt >= AgronomicStore.STATISTICS_SYNC_COOLDOWN_MS
    );
  }

  /**
   * Triggers an on-demand agronomic-statistic ingestion (best-effort). Used to
   * keep the dashboard fresh between scheduled ingestion runs.
   */
  syncStatistics(onComplete?: () => void): void {
    this.agronomicApi
      .ingestStatistics()
      .pipe(take(1))
      .subscribe({
        next: () => onComplete?.(),
        error: (error) => this.registerError(error),
      });
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
    this.runExclusive('plots', this.agronomicApi.getPlots(), (plots) => {
      this.plots.set(this.mergePlotHealth(plots, this.myPlotsOverview()));
      this.plotsLoaded.set(true);

      if (plots.length > 0 && this.selectedMapPlotId() === null) {
        this.selectMapPlot(plots[0].id);
      }
    });
  }

  /** Loads the aggregated overview (real IoT + plot-health counts). */
  fetchMyPlotsOverview(): void {
    this.runExclusive('overview', this.agronomicApi.getMyPlotsOverview(), (overview) => {
      this.myPlotsOverview.set(overview);
      this.devicesLoaded.set(true);
      this.plots.update((plots) => this.mergePlotHealth(plots, overview));
    });
  }

  /** Loads the All Plots current monitoring summary (and its weather snapshot). */
  fetchCurrentMonitoringSummary(): void {
    this.runExclusive('summary', this.agronomicApi.getCurrentMonitoringSummary(), (summary) => {
      this.monitoringSummary.set(summary);
      this.summaryLoaded.set(Boolean(summary));

      if (this.selectedDashboardScope() === 'all') {
        this.weatherSummary.set(summary?.weather ?? null);
      }
    });
  }

  /** Loads the current monitoring summary for a single plot. */
  fetchPlotMonitoringSummary(plotId: DashboardScope): void {
    const key = String(plotId);

    this.runExclusive('summary', this.agronomicApi.getPlotMonitoringSummary(plotId), (summary) => {
      if (summary) {
        this.plotSummaryCache.update((cache) => ({ ...cache, [key]: summary }));
      }

      if (String(this.selectedDashboardScope()) !== key) {
        return;
      }

      // Don't blank cached figures if a background refresh comes back empty (404).
      if (summary || !(key in this.plotSummaryCache())) {
        this.plotMonitoringSummary.set(summary);
      }

      if (summary?.weather && !this.weatherSummary()) {
        this.weatherSummary.set(summary.weather);
      }
    });
  }

  /**
   * Loads a plot's weather into {@link plotWeatherCache} if absent. Used by the
   * Weather page to populate every plot in the side list concurrently — it does
   * NOT go through the single-channel {@link runExclusive} (which would cancel
   * all but the last) and never touches the dashboard's scoped signals.
   */
  ensurePlotWeather(plotId: number | string): void {
    const key = String(plotId);

    if (key in this.plotWeatherCache() || this.ensureInFlight.has(`weather:${key}`)) {
      return;
    }

    this.ensureInFlight.add(`weather:${key}`);

    this.agronomicApi
      .getPlotWeatherForecast(plotId)
      .pipe(
        take(1),
        finalize(() => this.ensureInFlight.delete(`weather:${key}`)),
      )
      .subscribe({
        next: (weather) => {
          if (weather) {
            this.plotWeatherCache.update((cache) => ({ ...cache, [key]: weather }));
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Loads a plot's monitoring summary into {@link plotSummaryCache} if absent. */
  ensurePlotSummary(plotId: number | string): void {
    const key = String(plotId);

    if (key in this.plotSummaryCache() || this.ensureInFlight.has(`summary:${key}`)) {
      return;
    }

    this.ensureInFlight.add(`summary:${key}`);

    this.agronomicApi
      .getPlotMonitoringSummary(plotId)
      .pipe(
        take(1),
        finalize(() => this.ensureInFlight.delete(`summary:${key}`)),
      )
      .subscribe({
        next: (summary) => {
          if (summary) {
            this.plotSummaryCache.update((cache) => ({ ...cache, [key]: summary }));
          }
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Drops a plot's cached summary + weather (after edit/delete). */
  private evictPlotCaches(key: string): void {
    this.plotSummaryCache.update(({ [key]: _summary, ...rest }) => rest);
    this.plotWeatherCache.update(({ [key]: _weather, ...rest }) => rest);
  }

  /** Forces a fresh weather + summary fetch for one plot (Weather page refresh). */
  reloadPlotWeather(plotId: number | string): void {
    this.evictPlotCaches(String(plotId));
    this.ensurePlotWeather(plotId);
    this.ensurePlotSummary(plotId);
  }

  fetchPlotWeatherForecast(plotId: DashboardScope): void {
    const key = String(plotId);

    this.runExclusive('weather', this.agronomicApi.getPlotWeatherForecast(plotId), (weather) => {
      if (weather) {
        this.plotWeatherCache.update((cache) => ({ ...cache, [key]: weather }));
      }

      if (weather && String(this.selectedDashboardScope()) === key) {
        this.weatherSummary.set(weather);
      }
    });
  }

  fetchTrendStatistics(
    plotId: DashboardScope = this.selectedTrendPlotId(),
    timeRange: TrendAnalysisTimeRange = this.selectedTrendTimeRange(),
  ): void {
    this.runExclusive(
      'statistics',
      this.agronomicApi.getAgronomicStatisticsSeries(plotId, timeRange),
      (statistics) => this.trendAgronomicStatistics.set(statistics),
    );
  }

  selectDashboardScope(scope: DashboardScope): void {
    this.selectedDashboardScope.set(scope);

    if (scope === 'all') {
      // "All Plots" leaves the Plot Overview widget on its own selection.
      this.plotMonitoringSummary.set(null);
      this.weatherSummary.set(this.monitoringSummary()?.weather ?? null);
      this.loadScopeData(scope);
      return;
    }

    // Picking a specific plot mirrors it onto the Plot Overview widget (its
    // map/selector follow the active plot).
    this.selectMapPlot(scope);

    // Seed from cache so a re-selected plot renders instantly; only the first
    // visit to a plot shows the loading state. `loadScopeData` then refreshes
    // both signals (and the cache) silently in the background.
    const key = String(scope);
    this.plotMonitoringSummary.set(this.plotSummaryCache()[key] ?? null);
    this.weatherSummary.set(this.plotWeatherCache()[key] ?? null);

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
    this.runExclusive('devices', this.agronomicApi.getIotDevices(), (devices) => {
      this.devices.set(devices);
      this.devicesLoaded.set(true);
    });
  }

  /**
   * Selects a device for the edit form. The device is resolved from the loaded
   * `devices` list (the backend has no single-device GET; the flat collection is
   * the source of truth). `loadReferenceData` ensures the list is fetched.
   */
  fetchDeviceById(id: number | string): void {
    this.selectedDeviceId.set(id);
  }

  /**
   * Registers a new plot against the real backend. On success it stores the
   * registration result (for the wizard's confirmation step) and refreshes the
   * overview so the new plot appears on My Plots.
   */
  createPlot(
    request: CreatePlotRequest,
    onSuccess?: (registration: PlotRegistration) => void,
    onError?: (error: unknown) => void,
  ): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .createPlot(request)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: (registration) => {
          this.lastPlotRegistration.set(registration);
          this.plotsLoaded.set(false);
          this.fetchMyPlotsOverview();
          onSuccess?.(registration);
        },
        error: (error) => {
          this.registerError(error);
          onError?.(error);
        },
      });
  }

  /**
   * Partially updates a plot via PATCH (reuses the Create Plot wizard in edit
   * mode). On success it invalidates every cached view that depends on the plot
   * — per-plot monitoring summary, weather, and the detail — because an edited
   * boundary changes area/NDVI/weather; without this the dashboard would keep
   * serving the pre-edit figures from {@link plotSummaryCache}. Then it reloads
   * plots + overview so the new name/area/crop propagate.
   */
  updatePlot(
    plotId: number | string,
    changes: UpdatePlotRequest,
    onSuccess?: () => void,
    onError?: (error: unknown) => void,
  ): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .updatePlot(plotId, changes)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: () => {
          const key = String(plotId);
          this.evictPlotCaches(key);

          if (String(this.selectedDashboardScope()) === key) {
            this.plotMonitoringSummary.set(null);
            this.weatherSummary.set(null);
          }

          if (String(this.plotDetail()?.id ?? '') === key) {
            this.plotDetail.set(null);
          }

          this.plotsLoaded.set(false);
          this.fetchPlots();
          this.fetchMyPlotsOverview();
          onSuccess?.();
        },
        error: (error) => {
          this.registerError(error);
          onError?.(error);
        },
      });
  }

  /** Loads the active compensatory nutrition plan for a plot (null = none yet). */
  fetchActiveNutritionPlan(plotId: number | string): void {
    this.setLoading('nutrition', true);
    this.activeNutritionPlan.set(null);

    this.agronomicApi
      .getActiveNutritionPlan(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('nutrition', false)),
      )
      .subscribe({
        next: (plan) => this.activeNutritionPlan.set(plan),
        error: (error) => this.registerError(error),
      });
  }

  /** Generates a new nutrition plan for a plot and stores it as the active one. */
  generateNutritionPlan(
    plotId: number | string,
    onSuccess?: (plan: DynamicNutritionPlan | null) => void,
    onError?: (error: unknown) => void,
  ): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .generateNutritionPlan(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: (plan) => {
          this.activeNutritionPlan.set(plan);
          onSuccess?.(plan);
        },
        error: (error) => {
          this.registerError(error);
          onError?.(error);
        },
      });
  }

  /** Certifies the field application of a plan; refreshes the stored plan. */
  certifyNutritionPlan(
    planId: number | string,
    certification: CertifyNutritionPlanResource,
    onSuccess?: () => void,
    onError?: (error: unknown) => void,
  ): void {
    this.setLoading('saving', true);

    this.agronomicApi
      .certifyNutritionPlan(planId, certification)
      .pipe(
        take(1),
        finalize(() => this.setLoading('saving', false)),
      )
      .subscribe({
        next: (plan) => {
          if (plan) {
            this.activeNutritionPlan.set(plan);
          }
          onSuccess?.();
        },
        error: (error) => {
          this.registerError(error);
          onError?.(error);
        },
      });
  }

  /** Loads the configuration + monitoring detail for one plot. */
  fetchPlotDetail(plotId: number | string): void {
    this.setLoading('detail', true);
    this.plotDetail.set(null);

    this.agronomicApi
      .getPlotDetail(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('detail', false)),
      )
      .subscribe({
        next: (detail) => this.plotDetail.set(detail),
        error: (error) => this.registerError(error),
      });
  }

  /** Deletes a plot, then refreshes the overview so it disappears from My Plots. */
  deletePlot(
    plotId: number | string,
    onSuccess?: () => void,
    onError?: (error: unknown) => void,
  ): void {
    this.setLoading('deleting', true);

    this.agronomicApi
      .deletePlot(plotId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('deleting', false)),
      )
      .subscribe({
        next: () => {
          this.evictPlotCaches(String(plotId));
          this.plotsLoaded.set(false);
          this.fetchMyPlotsOverview();
          onSuccess?.();
        },
        error: (error) => {
          this.registerError(error);
          onError?.(error);
        },
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

  deleteDevice(device: IotDevice): void {
    if (device.id === null || device.plotId === null || device.plotId === undefined) {
      return;
    }

    const deviceId = device.id;
    this.setLoading('deleting', true);

    this.agronomicApi
      .deleteIotDevice(device.plotId, deviceId)
      .pipe(
        take(1),
        finalize(() => this.setLoading('deleting', false)),
      )
      .subscribe({
        next: () => {
          this.devices.update((devices) =>
            devices.filter((item) => String(item.id) !== String(deviceId)),
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

    const overviewById = new Map(
      overview.plots.map((plot) => [String(plot.id), plot] as const),
    );

    return plots.map((plot) => {
      const item = overviewById.get(String(plot.id));

      if (!item) {
        return plot;
      }

      const healthStatus = item.healthStatus;
      const phenologicalRisk = item.phenologicalRisk;

      if (healthStatus === plot.healthStatus && phenologicalRisk === plot.phenologicalRisk) {
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
        phenologicalRisk,
        cropType: plot.cropType,
        variety: plot.variety,
        location: plot.location,
        campaign: plot.campaign,
        notes: plot.notes,
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

  private createLeafHumidityCard(devices: IotDevice[]): IotSensorCard {
    const averageValue = this.average(devices.map((device) => device.leafHumidity));
    const riskLevel = this.highestRisk(
      devices.map((device) => this.getLeafHumidityRisk(device.leafHumidity)),
    );

    return new IotSensorCard({
      id: 'leaf-humidity',
      title: 'Leaf humidity',
      sourceLabel: 'IoT',
      metricLabel: 'Leaf humidity',
      metricValue: averageValue,
      metricUnit: '%',
      trend: riskLevel === 'High' ? 'up' : 'stable',
      riskLevel,
      recommendation: this.getLeafHumidityRecommendation(riskLevel),
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

  private getLeafHumidityRisk(value: number): IotRiskLevel {
    // Prolonged canopy wetness drives fungal disease risk, so HIGH leaf humidity
    // is the risky end (the opposite axis to soil moisture).
    if (value > 85) {
      return 'High';
    }

    if (value >= 70) {
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

  private getLeafHumidityRecommendation(riskLevel: IotRiskLevel): string {
    if (riskLevel === 'High') {
      return 'High canopy wetness — disease risk.';
    }

    if (riskLevel === 'Medium') {
      return 'Watch canopy wetness.';
    }

    return 'Canopy humidity is healthy.';
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
