import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

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

import {
  IotDeviceCollectionResponse,
  IotDeviceResource,
} from './iot-devices-response';
import { IotDeviceAssembler } from './iot-device.assembler';

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
  private readonly plotsOverviewEndpoint = this.endpoint(environment.endpoints.plotsOverview);
  private readonly monitoringCurrentEndpoint = this.endpoint(
    environment.endpoints.monitoringSummaryCurrent,
  );
  private readonly statisticsSeriesEndpoint = this.endpoint(
    environment.endpoints.agronomicStatisticsSeries,
  );

  // IoT device management remains on the mock API for now.
  private readonly iotDevicesEndpoint = this.mockEndpoint(environment.endpoints.iotDevices);

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
        catchError(() => of([] as Plot[])),
      );
  }

  /**
   * Fetches the aggregated My Plots overview (real IoT and plot-health counts).
   * @returns {Observable<MyPlotsOverview | null>}
   */
  getMyPlotsOverview(): Observable<MyPlotsOverview | null> {
    return this.http
      .get<MyPlotsOverviewResource>(this.plotsOverviewEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map((resource) => MyPlotsOverviewAssembler.toEntityFromResource(resource)),
        catchError(() => of(null)),
      );
  }

  /**
   * Fetches the All Plots current monitoring summary.
   * @returns {Observable<MonitoringSummary | null>}
   */
  getCurrentMonitoringSummary(): Observable<MonitoringSummary | null> {
    return this.http
      .get<MonitoringSummaryResource>(this.monitoringCurrentEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map((resource) => MonitoringSummaryAssembler.toEntityFromResource(resource)),
        catchError(() => of(null)),
      );
  }

  /**
   * Fetches the current monitoring summary for a single plot.
   * @returns {Observable<MonitoringSummary | null>}
   */
  getPlotMonitoringSummary(plotId: number | string): Observable<MonitoringSummary | null> {
    const url = `${this.plotsEndpoint.resourceUrl(plotId)}/monitoring-summary`;

    return this.http
      .get<PlotMonitoringSummaryResource>(url, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map((resource) => PlotMonitoringSummaryAssembler.toEntityFromResource(resource)),
        catchError(() => of(null)),
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
      timeRange: this.toBackendTimeRange(timeRange),
    });

    if (plotId !== 'all') {
      params['plotId'] = plotId;
    }

    return this.http
      .get<AgronomicStatisticSeriesResource>(this.statisticsSeriesEndpoint.collectionUrl, {
        params: this.queryParams(params),
      })
      .pipe(
        map((resource) => AgronomicStatisticSeriesAssembler.toEntityFromResource(resource)),
        catchError(() => of(null)),
      );
  }

  /**
   * Fetches the weather forecast (current + 3-day) for a single plot.
   * @returns {Observable<WeatherSummary | null>}
   */
  getPlotWeatherForecast(plotId: number | string): Observable<WeatherSummary | null> {
    const url = `${this.plotsEndpoint.resourceUrl(plotId)}/weather-forecast`;

    return this.http
      .get<PlotWeatherForecastResource>(url, {
        params: this.queryParams(this.withUserId()),
      })
      .pipe(
        map((resource) => PlotWeatherForecastAssembler.toEntityFromResource(resource)),
        catchError(() => of(null)),
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
