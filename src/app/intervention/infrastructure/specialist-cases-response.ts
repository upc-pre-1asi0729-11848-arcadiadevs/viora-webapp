import {
  CaseSeverity,
  FieldStage,
  RequestStatus,
  SpecialistCase,
  SpecialistCases,
} from '../domain/model/specialist-case.entity';

/** Backend resource shape for `GET /specialist-cases`. */
export interface SpecialistCasesResource {
  awaitingResponseCount: number | null;
  inProgressCount: number | null;
  closedCount: number | null;
  declinedCount: number | null;
  needsVisitCount: number | null;
  prescriptionPendingCount: number | null;
  prescribedCount: number | null;
  acceptanceRatePercent: number | null;
  cases: SpecialistCaseResource[] | null;
  updatedAt: string | null;
}

export interface SpecialistCaseResource {
  requestId: number | string | null;
  referenceCode: string | null;
  serviceProposalId: number | null;
  treatmentPrescriptionId: number | null;
  requestStatus: string | null;
  fieldStage: string | null;
  severity: string | null;
  problem: string | null;
  producerName: string | null;
  plotName: string | null;
  location: string | null;
  amount: number | null;
  currency: string | null;
  proposedDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const SEVERITIES: CaseSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const REQUEST_STATUSES: RequestStatus[] = [
  'AWAITING_RESPONSE',
  'PROPOSAL_RECEIVED',
  'ACCEPTED',
  'DECLINED',
];
const FIELD_STAGES: FieldStage[] = ['NEEDS_VISIT', 'FINDINGS_LOGGED', 'PRESCRIBED', 'CLOSED'];

function toDate(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class SpecialistCasesAssembler {
  static toEntityFromResource(resource: SpecialistCasesResource): SpecialistCases {
    return {
      awaitingResponseCount: resource.awaitingResponseCount ?? 0,
      inProgressCount: resource.inProgressCount ?? 0,
      closedCount: resource.closedCount ?? 0,
      declinedCount: resource.declinedCount ?? 0,
      needsVisitCount: resource.needsVisitCount ?? 0,
      prescriptionPendingCount: resource.prescriptionPendingCount ?? 0,
      prescribedCount: resource.prescribedCount ?? 0,
      acceptanceRatePercent: resource.acceptanceRatePercent ?? null,
      cases: (resource.cases ?? []).map(SpecialistCasesAssembler.toCase),
      updatedAt: toDate(resource.updatedAt),
    };
  }

  private static toCase(resource: SpecialistCaseResource): SpecialistCase {
    const severity = (resource.severity ?? '').toUpperCase() as CaseSeverity;
    const requestStatus = (resource.requestStatus ?? '').toUpperCase() as RequestStatus;
    const fieldStage = (resource.fieldStage ?? '').toUpperCase() as FieldStage;
    return {
      requestId: resource.requestId ?? '',
      referenceCode: resource.referenceCode ?? '',
      serviceProposalId: resource.serviceProposalId ?? null,
      treatmentPrescriptionId: resource.treatmentPrescriptionId ?? null,
      requestStatus: REQUEST_STATUSES.includes(requestStatus) ? requestStatus : null,
      fieldStage: FIELD_STAGES.includes(fieldStage) ? fieldStage : null,
      severity: SEVERITIES.includes(severity) ? severity : null,
      problem: resource.problem ?? '',
      producerName: resource.producerName ?? '',
      plotName: resource.plotName ?? '',
      location: resource.location ?? null,
      amount: resource.amount ?? null,
      currency: resource.currency ?? null,
      proposedDate: toDate(resource.proposedDate),
      createdAt: toDate(resource.createdAt),
      updatedAt: toDate(resource.updatedAt),
    };
  }
}
