import {
  InterventionRequest,
  InterventionRequestStatus,
} from '../domain/model/intervention-request.entity';

/** Backend resource shape for an intervention request (`/intervention-requests`). */
export interface InterventionRequestResource {
  id: number | null;
  referenceCode: string | null;
  growerId: number | null;
  plotId: number | null;
  specialistId: number | null;
  alertId: number | null;
  reason: string | null;
  message: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Request body for `POST /intervention-requests` (userId/grower injected by the API). */
export interface CreateInterventionRequestRequest {
  growerId: number;
  plotId: number;
  specialistId: number;
  alertId: number;
  reason: string;
  message?: string;
}

const KNOWN_STATUSES: InterventionRequestStatus[] = [
  'PENDING',
  'AWAITING_RESPONSE',
  'PROPOSAL_RECEIVED',
  'ACCEPTED',
  'DECLINED',
];

export class InterventionRequestAssembler {
  static toEntityFromResource(resource: InterventionRequestResource): InterventionRequest {
    const status = (resource.status ?? '').toUpperCase() as InterventionRequestStatus;

    return new InterventionRequest({
      id: resource.id ?? null,
      referenceCode: resource.referenceCode ?? '',
      growerId: resource.growerId ?? null,
      plotId: resource.plotId ?? null,
      specialistId: resource.specialistId ?? null,
      alertId: resource.alertId ?? null,
      reason: resource.reason ?? '',
      message: resource.message ?? '',
      status: KNOWN_STATUSES.includes(status) ? status : 'PENDING',
      createdAt: resource.createdAt ?? null,
      updatedAt: resource.updatedAt ?? null,
    });
  }

  static toEntitiesFromResources(resources: InterventionRequestResource[]): InterventionRequest[] {
    return resources.map((resource) => InterventionRequestAssembler.toEntityFromResource(resource));
  }
}
