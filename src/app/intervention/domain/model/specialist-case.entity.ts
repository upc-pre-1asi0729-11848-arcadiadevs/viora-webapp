/**
 * Read model for the specialist's own cases, powering both My Requests (pipeline
 * grouped by request status) and Field Inspection (accepted cases grouped by their
 * on-site lifecycle stage). One projection, two screens.
 *
 * Backend-provided strings (problem, producer/plot names) are shown verbatim;
 * fields with no source for a case are null and the view renders an empty state.
 */

export type RequestStatus = 'AWAITING_RESPONSE' | 'PROPOSAL_RECEIVED' | 'ACCEPTED' | 'DECLINED';

/** Specialist on-site lifecycle stage (accepted cases only). */
export type FieldStage = 'NEEDS_VISIT' | 'FINDINGS_LOGGED' | 'PRESCRIBED' | 'CLOSED';

export type CaseSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** A single specialist case. */
export interface SpecialistCase {
  readonly requestId: number | string;
  readonly referenceCode: string;
  /** Accepted/latest proposal — needed to open a treatment prescription. */
  readonly serviceProposalId: number | null;
  /** Treatment prescription id, once one exists (log findings / prescribe). */
  readonly treatmentPrescriptionId: number | null;
  readonly requestStatus: RequestStatus | null;
  readonly fieldStage: FieldStage | null;
  readonly severity: CaseSeverity | null;
  readonly problem: string;
  readonly producerName: string;
  readonly plotName: string;
  readonly location: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly proposedDate: Date | null;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

/** The full specialist cases read model with the section counters. */
export interface SpecialistCases {
  readonly awaitingResponseCount: number;
  readonly inProgressCount: number;
  readonly closedCount: number;
  readonly declinedCount: number;
  readonly needsVisitCount: number;
  readonly prescriptionPendingCount: number;
  readonly prescribedCount: number;
  readonly acceptanceRatePercent: number | null;
  readonly cases: SpecialistCase[];
  readonly updatedAt: Date | null;
}

/** Cost caption ("S/ 180") from the case's proposal, or "—" when none. */
export function caseCostLabel(item: SpecialistCase): string {
  if (item.amount == null) {
    return '—';
  }
  const currency = item.currency || '';
  return `${currency} ${item.amount}`.trim();
}
