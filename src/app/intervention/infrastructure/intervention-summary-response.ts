import { Intervention, InterventionStatus } from '../domain/model/intervention-summary.entity';

/** Backend resource shape for `GET /interventions`. */
export interface InterventionSummaryResource {
  code: string | null;
  interventionRequestId: number | null;
  referenceCode: string | null;
  plotId: number | null;
  alertId: number | null;
  specialistId: number | null;
  serviceProposalId: number | null;
  treatmentPrescriptionId: number | null;
  interventionExecutionId: number | null;
  interventionOutcomeId: number | null;
  status: string | null;
  serviceTitle: string | null;
  amount: number | null;
  currency: string | null;
}

const KNOWN_STATUSES: InterventionStatus[] = [
  'AWAITING_PRESCRIPTION',
  'PRESCRIPTION_ISSUED',
  'RECOVERY_MONITORING',
  'READY_TO_CLOSE',
  'CLOSED',
];

export class InterventionSummaryAssembler {
  static toEntityFromResource(resource: InterventionSummaryResource): Intervention {
    const status = (resource.status ?? '').toUpperCase() as InterventionStatus;
    return new Intervention({
      code: resource.code ?? '',
      interventionRequestId: resource.interventionRequestId ?? null,
      referenceCode: resource.referenceCode ?? '',
      plotId: resource.plotId ?? null,
      alertId: resource.alertId ?? null,
      specialistId: resource.specialistId ?? null,
      serviceProposalId: resource.serviceProposalId ?? null,
      treatmentPrescriptionId: resource.treatmentPrescriptionId ?? null,
      interventionExecutionId: resource.interventionExecutionId ?? null,
      interventionOutcomeId: resource.interventionOutcomeId ?? null,
      status: KNOWN_STATUSES.includes(status) ? status : 'AWAITING_PRESCRIPTION',
      serviceTitle: resource.serviceTitle ?? '',
      amount: resource.amount ?? null,
      currency: resource.currency ?? 'PEN',
    });
  }

  static toEntitiesFromResources(resources: InterventionSummaryResource[]): Intervention[] {
    return resources.map((resource) => InterventionSummaryAssembler.toEntityFromResource(resource));
  }
}
