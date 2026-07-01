import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { SpecialistCandidate } from '../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../domain/model/intervention-request.entity';
import { ServiceProposal } from '../domain/model/service-proposal.entity';
import { SpecialistContact } from '../domain/model/specialist-contact.entity';
import {
  SpecialistCandidateAssembler,
  SpecialistCandidateResource,
} from './specialist-candidate-response';
import {
  CreateInterventionRequestRequest,
  InterventionRequestAssembler,
  InterventionRequestResource,
} from './intervention-request-response';
import {
  ServiceProposalAssembler,
  ServiceProposalResource,
  UpdateServiceProposalStatusRequest,
} from './service-proposal-response';
import {
  SpecialistContactAssembler,
  SpecialistContactResource,
} from './specialist-contact-response';

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
  private readonly proposalsEndpoint = this.endpoint(environment.endpoints.serviceProposals);
  private readonly specialistsEndpoint = this.endpoint(environment.endpoints.specialists);

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
   * Lists all of the active producer's intervention requests, across every plot.
   * Used by the case-detail view so a case resolves on a deep link / refresh even
   * when the per-plot overview list hasn't been loaded yet.
   * @returns {Observable<InterventionRequest[]>}
   */
  getAllRequests(): Observable<InterventionRequest[]> {
    return this.http
      .get<InterventionRequestResource[]>(this.requestsEndpoint.collectionUrl, {
        params: this.queryParams({ growerId: this.defaultUserId }),
      })
      .pipe(map((resources) => InterventionRequestAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Declines an intervention request, returning the case to specialist search.
   * @param {number|string} id - Request identifier.
   * @param {string} reason - Optional reason for declining.
   * @returns {Observable<InterventionRequest>}
   */
  declineRequest(id: number | string, reason: string): Observable<InterventionRequest> {
    return this.http
      .patch<InterventionRequestResource>(this.requestsEndpoint.resourceUrl(id), { reason })
      .pipe(map((resource) => InterventionRequestAssembler.toEntityFromResource(resource)));
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

  /**
   * Lists the service proposals submitted for an intervention request. A request
   * has at most one active proposal today (the specialist's response).
   * @param {number|string} requestId - Request the proposals belong to.
   * @returns {Observable<ServiceProposal[]>}
   */
  getProposalsByRequest(requestId: number | string): Observable<ServiceProposal[]> {
    return this.http
      .get<ServiceProposalResource[]>(this.proposalsEndpoint.collectionUrl, {
        params: this.queryParams({ requestId }),
      })
      .pipe(map((resources) => ServiceProposalAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Accepts or rejects a service proposal. Accepting moves the linked request to
   * ACCEPTED (unlocking contact); rejecting moves it to DECLINED (search reopens).
   * @param {number|string} id - Proposal identifier.
   * @param {'ACCEPTED'|'REJECTED'} status - New proposal status.
   * @param {string} [reason] - Optional reason (used when rejecting).
   * @returns {Observable<ServiceProposal>}
   */
  updateProposalStatus(
    id: number | string,
    status: 'ACCEPTED' | 'REJECTED',
    reason?: string,
  ): Observable<ServiceProposal> {
    const body: UpdateServiceProposalStatusRequest = { status, reason };
    return this.http
      .patch<ServiceProposalResource>(this.proposalsEndpoint.resourceUrl(id), body)
      .pipe(map((resource) => ServiceProposalAssembler.toEntityFromResource(resource)));
  }

  /**
   * Fetches a specialist's private contact details. The backend returns 403 until
   * the given request has been accepted for that specialist.
   * @param {number|string} specialistId - Specialist whose contact is requested.
   * @param {number|string} requestId - The accepted request unlocking the contact.
   * @returns {Observable<SpecialistContact>}
   */
  getSpecialistContact(
    specialistId: number | string,
    requestId: number | string,
  ): Observable<SpecialistContact> {
    return this.http
      .get<SpecialistContactResource>(
        `${this.specialistsEndpoint.resourceUrl(specialistId)}/contact`,
        { params: this.queryParams({ requestId }) },
      )
      .pipe(map((resource) => SpecialistContactAssembler.toEntityFromResource(resource)));
  }

  /**
   * Simulates the specialist responding to a request by submitting a proposal on
   * their behalf (there is no specialist-facing app yet). Moves the request to
   * PROPOSAL_RECEIVED so the full case flow can be demoed end-to-end.
   * @param {number|string} requestId - Request to generate a proposal for.
   * @returns {Observable<InterventionRequest>}
   */
  simulateSpecialistResponse(requestId: number | string): Observable<InterventionRequest> {
    return this.http
      .post<InterventionRequestResource>(
        `${this.requestsEndpoint.resourceUrl(requestId)}/simulate-specialist-response`,
        {},
      )
      .pipe(map((resource) => InterventionRequestAssembler.toEntityFromResource(resource)));
  }
}
