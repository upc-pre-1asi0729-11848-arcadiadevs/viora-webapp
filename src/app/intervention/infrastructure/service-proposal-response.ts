import {
  ServiceProposal,
  ServiceProposalStatus,
} from '../domain/model/service-proposal.entity';

/** Backend resource shape for `GET/POST/PATCH /service-proposals`. */
export interface ServiceProposalResource {
  id: number | null;
  interventionRequestId: number | null;
  specialistId: number | null;
  serviceTitle: string | null;
  durationLabel: string | null;
  scope: string[] | null;
  proposedDate: string | null;
  amount: number | null;
  currency: string | null;
  proposalDetails: string | null;
  status: string | null;
}

/** Request body for `PATCH /service-proposals/{id}` (accept / reject). */
export interface UpdateServiceProposalStatusRequest {
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
}

const KNOWN_STATUSES: ServiceProposalStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED'];

export class ServiceProposalAssembler {
  static toEntityFromResource(resource: ServiceProposalResource): ServiceProposal {
    const status = (resource.status ?? '').toUpperCase() as ServiceProposalStatus;

    return new ServiceProposal({
      id: resource.id ?? null,
      interventionRequestId: resource.interventionRequestId ?? null,
      specialistId: resource.specialistId ?? null,
      serviceTitle: resource.serviceTitle ?? '',
      durationLabel: resource.durationLabel ?? '',
      scope: resource.scope ?? [],
      proposedDate: resource.proposedDate ?? null,
      amount: resource.amount ?? null,
      currency: resource.currency ?? null,
      proposalDetails: resource.proposalDetails ?? '',
      status: KNOWN_STATUSES.includes(status) ? status : 'PENDING',
    });
  }

  static toEntitiesFromResources(resources: ServiceProposalResource[]): ServiceProposal[] {
    return resources.map((resource) => ServiceProposalAssembler.toEntityFromResource(resource));
  }
}
