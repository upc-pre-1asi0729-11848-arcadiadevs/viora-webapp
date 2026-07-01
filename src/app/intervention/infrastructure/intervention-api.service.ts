import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { SpecialistCandidate } from '../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../domain/model/intervention-request.entity';
import {
  SpecialistCandidateAssembler,
  SpecialistCandidateResource,
} from './specialist-candidate-response';
import {
  CreateInterventionRequestRequest,
  InterventionRequestAssembler,
  InterventionRequestResource,
} from './intervention-request-response';

@Injectable({
  providedIn: 'root',
})
/**
 * Infrastructure gateway for the Intervention bounded context (Expert Assistance),
 * served by the real Viora Platform backend. Intervention requests are a real
 * aggregate (create + list by grower/plot); specialist candidates come from a
 * backend matching stub, so callers may supplement them with presentation data.
 *
 * @class InterventionApiService
 * @extends BaseApi
 */
export class InterventionApiService extends BaseApi {
  private readonly requestsEndpoint = this.endpoint(environment.endpoints.interventionRequests);
  private readonly candidatesEndpoint = this.endpoint(environment.endpoints.specialistCandidates);

  /**
   * Fetches ranked specialist candidates for an alert.
   * @param {number|string} alertId - Alert the specialists are matched against.
   * @param {number} limit - Maximum number of candidates to return.
   * @returns {Observable<SpecialistCandidate[]>}
   */
  getSpecialistCandidates(alertId: number | string, limit = 3): Observable<SpecialistCandidate[]> {
    return this.http
      .get<SpecialistCandidateResource[]>(this.candidatesEndpoint.collectionUrl, {
        params: this.queryParams({ alertId, limit }),
      })
      .pipe(map((resources) => SpecialistCandidateAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Lists the active producer's intervention requests, scoped to a single plot
   * (the per-plot "My assistance requests" history).
   * @param {number|string} plotId - Plot whose request history is retrieved.
   * @returns {Observable<InterventionRequest[]>}
   */
  getRequestsByPlot(plotId: number | string): Observable<InterventionRequest[]> {
    return this.http
      .get<InterventionRequestResource[]>(this.requestsEndpoint.collectionUrl, {
        params: this.queryParams({ growerId: this.defaultUserId, plotId }),
      })
      .pipe(map((resources) => InterventionRequestAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Sends a formal intervention request to a specialist, linked to the plot's
   * active alert. The grower is the active producer. Errors are not swallowed so
   * the modal can surface them.
   * @returns {Observable<InterventionRequest>}
   */
  createRequest(
    request: Omit<CreateInterventionRequestRequest, 'growerId'>,
  ): Observable<InterventionRequest> {
    const body: CreateInterventionRequestRequest = {
      growerId: Number(this.defaultUserId),
      ...request,
    };

    return this.http
      .post<InterventionRequestResource>(this.requestsEndpoint.collectionUrl, body)
      .pipe(map((resource) => InterventionRequestAssembler.toEntityFromResource(resource)));
  }
}
