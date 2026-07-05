import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { SpecialistMarketplace } from '../domain/model/marketplace-case.entity';
import {
  SpecialistMarketplaceAssembler,
  SpecialistMarketplaceResource,
} from './specialist-marketplace-response';

/** Payload for a specialist submitting a service proposal on an incoming case. */
export interface SubmitProposalRequest {
  interventionRequestId: number | string;
  specialistId: number;
  serviceTitle: string;
  durationLabel: string;
  scope: string[];
  proposedDate: string;
  amount: number;
  currency: string;
  proposalDetails: string;
}

/**
 * Infrastructure gateway for the specialist Intervention Marketplace, served by
 * the real Viora Platform backend. The signed-in specialist is derived from the
 * bearer token (`@CurrentUserId`), so no id travels in the marketplace URL.
 *
 * The two case actions reuse the real intervention endpoints: submitting a
 * proposal (`POST /service-proposals`, which moves the request out of the
 * specialist's PENDING inbox) and declining a case as the assigned specialist
 * (`POST /intervention-requests/{id}/declines`).
 *
 * @class SpecialistMarketplaceApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class SpecialistMarketplaceApiService extends BaseApi {
  private readonly marketplaceEndpoint = this.endpoint(environment.endpoints.interventionMarketplace);
  private readonly proposalsEndpoint = this.endpoint(environment.endpoints.serviceProposals);
  private readonly requestsEndpoint = this.endpoint(environment.endpoints.interventionRequests);

  /** Fetches the specialist's marketplace of incoming cases. */
  getMarketplace(): Observable<SpecialistMarketplace> {
    return this.http
      .get<SpecialistMarketplaceResource>(this.marketplaceEndpoint.collectionUrl)
      .pipe(map((resource) => SpecialistMarketplaceAssembler.toEntityFromResource(resource)));
  }

  /**
   * Submits a service proposal for an incoming case. On success the linked request
   * moves to PROPOSAL_RECEIVED and drops out of the marketplace inbox.
   */
  submitProposal(request: SubmitProposalRequest): Observable<unknown> {
    return this.http.post(this.proposalsEndpoint.collectionUrl, request);
  }

  /** Declines an incoming case as the assigned specialist, returning it to search. */
  declineCase(requestId: number | string, reason: string): Observable<unknown> {
    return this.http.post(`${this.requestsEndpoint.resourceUrl(requestId)}/declines`, { reason });
  }
}
