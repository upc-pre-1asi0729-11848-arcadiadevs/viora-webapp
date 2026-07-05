import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { SpecialistDashboard } from '../domain/model/specialist-dashboard.entity';
import { IncomingRequest } from '../domain/model/specialist-dashboard.entity';
import {
  SpecialistDashboardAssembler,
  SpecialistDashboardResource,
} from './specialist-dashboard-response';

/**
 * Infrastructure gateway for the Specialist segment dashboard, served by the
 * real Viora Platform backend. The signed-in specialist is derived from the
 * bearer token (`@CurrentUserId`), so no id travels in the URL.
 *
 * @class SpecialistDashboardApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class SpecialistDashboardApiService extends BaseApi {
  private readonly dashboardEndpoint = this.endpoint(environment.endpoints.specialistDashboard);
  private readonly requestsEndpoint = this.endpoint(environment.endpoints.interventionRequests);

  /** Fetches the specialist's aggregated dashboard read model. */
  getDashboard(): Observable<SpecialistDashboard> {
    return this.http
      .get<SpecialistDashboardResource>(this.dashboardEndpoint.collectionUrl)
      .pipe(map((resource) => SpecialistDashboardAssembler.toEntityFromResource(resource)));
  }

  /**
   * Verifies (accepts) an incoming producer request, taking on the case. The
   * backend transitions the request out of the specialist's incoming queue.
   */
  verifyRequest(request: IncomingRequest): Observable<unknown> {
    return this.http.post(
      `${this.requestsEndpoint.resourceUrl(request.id)}/verifications`,
      {},
    );
  }

  /** Declines an incoming producer request, returning it to specialist search. */
  declineRequest(request: IncomingRequest, reason = ''): Observable<unknown> {
    return this.http.post(
      `${this.requestsEndpoint.resourceUrl(request.id)}/declines`,
      { reason },
    );
  }
}
