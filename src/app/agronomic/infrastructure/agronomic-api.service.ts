import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, catchError, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiQueryParams, BaseApi } from '../../shared/infrastructure/base-api';

import { Plot } from '../domain/model/plot.entity';
import { MonitoringSummary } from '../domain/model/monitoring-summary.entity';
import { WeatherSummary } from '../domain/model/weather-summary.entity';
import { AgronomicStatistics } from '../domain/model/agronomic-statistics.entity';
import { MyPlotsOverview } from '../domain/model/my-plots-overview.entity';
import { IotDevice } from '../domain/model/iot-device.entity';

import { PlotResource } from './plots-response';
import { PlotAssembler } from './plot.assembler';
import { MonitoringSummaryResource } from './monitoring-summaries-response';
import { MonitoringSummaryAssembler } from './monitoring-summary.assembler';
import { PlotMonitoringSummaryResource } from './plot-monitoring-summary-response';
import { PlotMonitoringSummaryAssembler } from './plot-monitoring-summary.assembler';
import { AgronomicStatisticSeriesResource } from './agronomic-statistic-series-response';
import { AgronomicStatisticSeriesAssembler } from './agronomic-statistic-series.assembler';
import { PlotWeatherForecastResource } from './plot-weather-forecast-response';
import { PlotWeatherForecastAssembler } from './plot-weather-forecast.assembler';
import { MyPlotsOverviewResource } from './my-plots-overview-response';
import { MyPlotsOverviewAssembler } from './my-plots-overview.assembler';
import { PlotRegistration } from '../domain/model/plot-registration.entity';
import {
  CreatePlotResource,
  PlotRegistrationResource,
  UpdatePlotResource,
} from './plot-registration-response';
import { PlotRegistrationAssembler } from './plot-registration.assembler';
import { PlotDetail } from '../domain/model/plot-detail.entity';
import { PlotDetailResource } from './plot-detail-response';
import { PlotDetailAssembler } from './plot-detail.assembler';

import {
  IotDeviceCollectionResponse,
  IotDeviceResource,
} from './iot-devices-response';
import { IotDeviceAssembler } from './iot-device.assembler';

import { DynamicNutritionPlan } from '../domain/model/dynamic-nutrition-plan.entity';
import {
  CertifyNutritionPlanResource,
  DynamicNutritionPlanResource,
} from './dynamic-nutrition-plan-response';
import { DynamicNutritionPlanAssembler } from './dynamic-nutrition-plan.assembler';

/**
 * Trend ranges understood by the agronomic statistics series endpoint.
 */
export type SeriesTimeRange = '7days' | '30days' | 'campaign';

@Injectable({
  providedIn: 'root',
})
/**
 * Infrastructure gateway for the Agronomic bounded context.
 *
 * Dashboard data is served by the real Viora Platform backend, while IoT device
 * management still relies on the mock API until the real per-plot telemetry
 * endpoints expose sensor readings.
 *
 * @class AgronomicApiService
 * @extends BaseApi
 */
export class AgronomicApiService extends BaseApi {
  private readonly plotsEndpoint = this.endpoint(environment.endpoints.plots);
  private readonly monitoringSummariesEndpoint = this.endpoint(
    environment.endpoints.monitoringSummaries,
  );
  private readonly statisticsEndpoint = this.endpoint(
    environment.endpoints.agronomicStatistics,
  );
  private readonly nutritionPlansEndpoint = this.endpoint(
    environment.endpoints.dynamicNutritionPlans,
  );

  // IoT device management remains on the mock API for now.
  private readonly iotDevicesEndpoint = this.mockEndpoint(environment.endpoints.iotDevices);

  /**
   * Maps a "no data yet" `404` to the given empty value (an expected backend
   * state, e.g. `monitoring-summaries` before the first ingestion),
   * while letting real failures (5xx, network, CORS) propagate. The store keeps
   * its cached signal on a propagated error instead of blanking the dashboard,
   * so a transient outage no longer wipes good data.
   */
  private emptyOnNotFound<T>(empty: T): MonoTypeOperatorFunction<T> {
    return catchError((error: unknown) =>
      error instanceof HttpErrorResponse && error.status === 404
        ? of(empty)
        : throwError(() => error),
    );
  }

  /**
   * Fetches the producer's plots together with their current satellite imagery.
   * @returns {Observable<Plot[]>}
   */
  getPlots(): Observable<Plot[]> {
    return this.http
      .get<PlotResource[]>(this.plotsEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId({ includeCurrentImagery: true })),
      })
      .pipe(
        map((resources) => PlotAssembler.toEntitiesFromResources(resources ?? [])),
        this.emptyOnNotFound<Plot[]>([]),
      );
  }

  /**
   * Fetches the aggregated My Plots overview (real IoT and plot-health counts).
   * @returns {Observable<MyPlotsOverview | null>}
   */
  getMyPlotsOverview(): Observable<MyPlotsOverview | null> {
    return this.http
      .get<MyPlotsOverviewResource>(this.plotsEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId({ view: 'overview' })),
      })
      .pipe(
        map((resource) => MyPlotsOverviewAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<MyPlotsOverview | null>(null),
      );
  }

  /**
   * Registers a new plot. The backend computes the area, persists the boundary,
   * and links climate/satellite monitoring (AgronoMonitoring) automatically.
   * Errors are intentionally not swallowed so the wizard can surface them.
   * @returns {Observable<PlotRegistration>}
   */
  createPlot(request: Omit<CreatePlotResource, 'userId'>): Observable<PlotRegistration> {
    const body: CreatePlotResource = {
      userId: Number(this.defaultUserId),
      ...request,
    };

    return this.http
      .post<PlotRegistrationResource>(this.plotsEndpoint.collectionUrl, body)
      .pipe(map((resource) => PlotRegistrationAssembler.toEntityFromResource(resource)));
  }

  /**
   * Partially updates a plot (PATCH /plots/{plotId}). The backend keeps any
   * field that is omitted from the body, recomputes the area, and re-links
   * climate/satellite monitoring when the boundary changes. Errors are not
   * swallowed so the edit form can surface them.
   * @returns {Observable<void>}
   */
  updatePlot(plotId: number | string, changes: UpdatePlotResource): Observable<void> {
    return this.http
      .patch<unknown>(this.plotsEndpoint.resourceUrl(plotId), changes)
      .pipe(map(() => undefined));
  }

  /**
   * Fetches the All Plots current monitoring summary.
   * @returns {Observable<MonitoringSummary | null>}
   */
  getCurrentMonitoringSummary(): Observable<MonitoringSummary | null> {
    return this.http
      .get<MonitoringSummaryResource>(this.monitoringSummariesEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map((resource) => MonitoringSummaryAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<MonitoringSummary | null>(null),
      );
  }

  /**
   * Fetches the configuration + monitoring detail for a single plot.
   * @returns {Observable<PlotDetail | null>}
   */
  getPlotDetail(plotId: number | string): Observable<PlotDetail | null> {
    return this.http
      .get<PlotDetailResource>(this.plotsEndpoint.resourceUrl(plotId), {
        params: this.queryParams(this.withUserId({ view: 'detail' })),
      })
      .pipe(
        map((resource) => PlotDetailAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<PlotDetail | null>(null),
      );
  }

  /**
   * Deletes a plot. The backend endpoint takes only the plot id in the path.
   * @returns {Observable<void>}
   */
  deletePlot(plotId: number | string): Observable<void> {
    return this.http.delete<void>(this.plotsEndpoint.resourceUrl(plotId));
  }

  /**
   * Triggers an on-demand agronomic-statistic ingestion for the active user, so
   * the dashboard summary and trend reflect the latest AgroMonitoring NDVI
   * without waiting for the daily scheduled job. Errors are swallowed since this
   * is a best-effort background sync.
   * @returns {Observable<void>}
   */
  ingestStatistics(): Observable<void> {
    return this.http
      .post<unknown>(this.statisticsEndpoint.collectionUrl, null, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      );
  }

  /**
   * Fetches the current monitoring summary for a single plot.
   * @returns {Observable<MonitoringSummary | null>}
   */
  getPlotMonitoringSummary(plotId: number | string): Observable<MonitoringSummary | null> {
    return this.http
      .get<PlotMonitoringSummaryResource>(this.plotsEndpoint.resourceUrl(plotId), {
        params: this.queryParams(this.withUserId({ view: 'monitoring' })),
      })
      .pipe(
        map((resource) => PlotMonitoringSummaryAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<MonitoringSummary | null>(null),
      );
  }

  /**
   * Fetches the agronomic statistics trend series for the Trend Analysis chart.
   * @returns {Observable<AgronomicStatistics | null>}
   */
  getAgronomicStatisticsSeries(
    plotId: number | string,
    timeRange: SeriesTimeRange,
  ): Observable<AgronomicStatistics | null> {
    const params: ApiQueryParams = this.withUserId({
      view: 'series',
      timeRange: this.toBackendTimeRange(timeRange),
    });

    if (plotId !== 'all') {
      params['plotId'] = plotId;
    }

    return this.http
      .get<AgronomicStatisticSeriesResource>(this.statisticsEndpoint.collectionUrl, {
        params: this.queryParams(params),
      })
      .pipe(
        map((resource) => AgronomicStatisticSeriesAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<AgronomicStatistics | null>(null),
      );
  }

  /**
   * Fetches the weather forecast (current + 3-day) for a single plot.
   * @returns {Observable<WeatherSummary | null>}
   */
  getPlotWeatherForecast(plotId: number | string): Observable<WeatherSummary | null> {
    return this.http
      .get<PlotWeatherForecastResource>(this.plotsEndpoint.resourceUrl(plotId), {
        params: this.queryParams(this.withUserId({ view: 'weather' })),
      })
      .pipe(
        map((resource) => PlotWeatherForecastAssembler.toEntityFromResource(resource)),
        this.emptyOnNotFound<WeatherSummary | null>(null),
      );
  }

  /**
   * Fetches all IoT devices (mock API).
   * @returns {Observable<IotDevice[]>}
   */
  getIotDevices(): Observable<IotDevice[]> {
    return this.http
      .get<IotDeviceCollectionResponse>(this.iotDevicesEndpoint.collectionUrl)
      .pipe(
        map((response) => this.collectionFrom(response, 'iotDevices')),
        map((resources) => IotDeviceAssembler.toEntitiesFromResources(resources)),
      );
  }

  /**
   * Fetches a single IoT device by id (mock API).
   * @returns {Observable<IotDevice>}
   */
  getIotDeviceById(id: number | string): Observable<IotDevice> {
    return this.http
      .get<IotDeviceResource>(this.iotDevicesEndpoint.resourceUrl(id))
      .pipe(map((resource) => IotDeviceAssembler.toEntityFromResource(resource)));
  }

  /**
   * Creates a new IoT device (mock API).
   * @returns {Observable<IotDevice>}
   */
  createIotDevice(device: IotDevice): Observable<IotDevice> {
    return this.http
      .post<IotDeviceResource>(
        this.iotDevicesEndpoint.collectionUrl,
        IotDeviceAssembler.toResourceFromEntity(device),
      )
      .pipe(map((resource) => IotDeviceAssembler.toEntityFromResource(resource)));
  }

  /**
   * Updates an existing IoT device (mock API).
   * @returns {Observable<IotDevice>}
   */
  updateIotDevice(device: IotDevice): Observable<IotDevice> {
    if (device.id === null) {
      return throwError(() => new Error('Cannot update an IoT device without an id.'));
    }

    return this.http
      .put<IotDeviceResource>(
        this.iotDevicesEndpoint.resourceUrl(device.id),
        IotDeviceAssembler.toResourceFromEntity(device),
      )
      .pipe(map((resource) => IotDeviceAssembler.toEntityFromResource(resource)));
  }

  /**
   * Deletes an IoT device (mock API).
   * @returns {Observable<void>}
   */
  deleteIotDevice(id: number | string): Observable<void> {
    return this.http.delete<void>(this.iotDevicesEndpoint.resourceUrl(id));
  }

  /**
   * Fetches the active compensatory nutrition plan for a plot. Returns null on
   * 404 (no plan yet) so the page can offer to generate one.
   * @returns {Observable<DynamicNutritionPlan | null>}
   */
  getActiveNutritionPlan(plotId: number | string): Observable<DynamicNutritionPlan | null> {
    return this.http
      .get<DynamicNutritionPlanResource[]>(this.nutritionPlansEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId({ plotId, status: 'ACTIVE' })),
      })
      .pipe(
        map((resources) => DynamicNutritionPlanAssembler.toEntityFromResource(resources?.[0])),
        this.emptyOnNotFound<DynamicNutritionPlan | null>(null),
      );
  }

  /**
   * Generates a new compensatory nutrition plan for a plot (no request body; the
   * backend derives it from the active alert + monitoring indicators).
   * @returns {Observable<DynamicNutritionPlan | null>}
   */
  generateNutritionPlan(plotId: number | string): Observable<DynamicNutritionPlan | null> {
    return this.http
      .post<DynamicNutritionPlanResource>(this.nutritionPlansEndpoint.collectionUrl, null, {
        params: this.queryParams(this.withUserId({ plotId })),
      })
      .pipe(map((resource) => DynamicNutritionPlanAssembler.toEntityFromResource(resource)));
  }

  /**
   * Certifies the field application of a plan (date, applied inputs, operator…).
   * @returns {Observable<DynamicNutritionPlan | null>}
   */
  certifyNutritionPlan(
    planId: number | string,
    certification: CertifyNutritionPlanResource,
  ): Observable<DynamicNutritionPlan | null> {
    return this.http
      .patch<DynamicNutritionPlanResource>(
        this.nutritionPlansEndpoint.resourceUrl(planId),
        certification,
        { params: this.queryParams(this.withUserId()) },
      )
      .pipe(map((resource) => DynamicNutritionPlanAssembler.toEntityFromResource(resource)));
  }

  /** Maps a frontend trend range to the backend TimeRange enum name. */
  private toBackendTimeRange(timeRange: SeriesTimeRange): string {
    switch (timeRange) {
      case '7days':
        return 'LAST_7_DAYS';
      case 'campaign':
        return 'CAMPAIGN';
      case '30days':
      default:
        return 'LAST_30_DAYS';
    }
  }
}
