import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiQueryParams, BaseApi } from '../../shared/infrastructure/base-api';

import { Alert } from '../domain/model/alert.entity';
import { AlertCollectionResponse, AlertResource } from './alerts-response';
import { AlertAssembler } from './alert.assembler';

type SurveillanceQueryParams = ApiQueryParams;

@Injectable({
  providedIn: 'root',
})
/**
 * Infrastructure service gateway for the Surveillance bounded-context endpoints.
 * Manages multiple specific endpoints for surveillance entities.
 *
 * @class SurveillanceApiService
 * @extends BaseApi
 */
export class SurveillanceApiService extends BaseApi {
  // Alerts belong to a bounded context still served by the mock API.
  private readonly alertsEndpoint = this.mockEndpoint(environment.endpoints.alerts);

  /**
   * Fetches Alerts resources.
   * @returns {Observable<Alert[]>}
   */
  getAlerts(params: SurveillanceQueryParams = {}): Observable<Alert[]> {
    return this.http
      .get<AlertCollectionResponse>(this.alertsEndpoint.collectionUrl, {
        params: this.queryParams(params),
      })
      .pipe(
        map((response) => this.collectionFrom(response, 'alerts')),
        map((resources) => AlertAssembler.toEntitiesFromResources(resources)),
      );
  }

  /**
   * Fetches AlertById resources.
   * @returns {Observable<Alert>}
   */
  getAlertById(id: number | string): Observable<Alert> {
    return this.http
      .get<AlertResource>(this.alertsEndpoint.resourceUrl(id))
      .pipe(map((resource) => AlertAssembler.toEntityFromResource(resource)));
  }
}
