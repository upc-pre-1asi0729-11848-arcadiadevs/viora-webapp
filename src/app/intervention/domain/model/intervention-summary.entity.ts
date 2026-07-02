/**
 * @file intervention-summary.entity.ts
 * @description Producer-facing view of a technical intervention: an accepted
 * assistance case composed with its lifecycle (prescription → execution → outcome).
 */
export type InterventionStatus =
  | 'AWAITING_PRESCRIPTION'
  | 'PRESCRIPTION_ISSUED'
  | 'RECOVERY_MONITORING'
  | 'READY_TO_CLOSE'
  | 'CLOSED';

/** Field-execution status recorded when certifying the prescription. */
export type ExecutionStatus = 'APPLIED_AS_PRESCRIBED' | 'PARTIALLY_APPLIED' | 'NOT_APPLIED';
/** Observed result reported after the grace period. */
export type ObservedResult =
  | 'PEST_PRESSURE_REDUCED'
  | 'SYMPTOMS_PERSIST'
  | 'NEW_SYMPTOMS_DETECTED'
  | 'NOT_ENOUGH_EVIDENCE_YET';
export type ImpactLevel = 'POSITIVE' | 'PARTIAL' | 'NEGATIVE' | 'INCONCLUSIVE';
export type ServiceResult = 'RESOLVED' | 'PARTIALLY_RESOLVED' | 'NOT_RESOLVED';
export type HireAgain = 'YES' | 'NO';

export interface InterventionProps {
  code?: string;
  interventionRequestId?: number | null;
  referenceCode?: string;
  plotId?: number | null;
  alertId?: number | null;
  specialistId?: number | null;
  serviceProposalId?: number | null;
  treatmentPrescriptionId?: number | null;
  interventionExecutionId?: number | null;
  interventionOutcomeId?: number | null;
  status?: InterventionStatus;
  serviceTitle?: string;
  amount?: number | null;
  currency?: string;
}

const STATUS_LABELS: Record<InterventionStatus, string> = {
  AWAITING_PRESCRIPTION: 'Awaiting prescription',
  PRESCRIPTION_ISSUED: 'Prescription issued',
  RECOVERY_MONITORING: 'Recovery monitoring',
  READY_TO_CLOSE: 'Ready to close',
  CLOSED: 'Closed',
};

const STATUS_CLASSES: Record<InterventionStatus, string> = {
  AWAITING_PRESCRIPTION: 'status-awaiting',
  PRESCRIPTION_ISSUED: 'status-issued',
  RECOVERY_MONITORING: 'status-recovery',
  READY_TO_CLOSE: 'status-ready',
  CLOSED: 'status-closed',
};

export class Intervention {
  readonly code: string;
  readonly interventionRequestId: number | null;
  readonly referenceCode: string;
  readonly plotId: number | null;
  readonly alertId: number | null;
  readonly specialistId: number | null;
  readonly serviceProposalId: number | null;
  readonly treatmentPrescriptionId: number | null;
  readonly interventionExecutionId: number | null;
  readonly interventionOutcomeId: number | null;
  readonly status: InterventionStatus;
  readonly serviceTitle: string;
  readonly amount: number | null;
  readonly currency: string;

  constructor({
    code = '',
    interventionRequestId = null,
    referenceCode = '',
    plotId = null,
    alertId = null,
    specialistId = null,
    serviceProposalId = null,
    treatmentPrescriptionId = null,
    interventionExecutionId = null,
    interventionOutcomeId = null,
    status = 'AWAITING_PRESCRIPTION',
    serviceTitle = '',
    amount = null,
    currency = 'PEN',
  }: InterventionProps = {}) {
    this.code = code;
    this.interventionRequestId = interventionRequestId;
    this.referenceCode = referenceCode;
    this.plotId = plotId;
    this.alertId = alertId;
    this.specialistId = specialistId;
    this.serviceProposalId = serviceProposalId;
    this.treatmentPrescriptionId = treatmentPrescriptionId;
    this.interventionExecutionId = interventionExecutionId;
    this.interventionOutcomeId = interventionOutcomeId;
    this.status = status;
    this.serviceTitle = serviceTitle;
    this.amount = amount;
    this.currency = currency;
  }

  get statusLabel(): string {
    return STATUS_LABELS[this.status] ?? this.status;
  }

  get statusClass(): string {
    return STATUS_CLASSES[this.status] ?? 'status-awaiting';
  }

  /** Human prescription code shown in the UI, e.g. "RX-018". */
  get prescriptionCode(): string {
    return this.treatmentPrescriptionId != null
      ? `RX-${String(this.treatmentPrescriptionId).padStart(3, '0')}`
      : '—';
  }

  get amountLabel(): string {
    if (this.amount == null) {
      return '—';
    }
    const symbol = this.currency === 'PEN' ? 'S/' : this.currency;
    return `${symbol} ${this.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  get needsPrescription(): boolean {
    return this.status === 'AWAITING_PRESCRIPTION';
  }
  get needsCertification(): boolean {
    return this.status === 'PRESCRIPTION_ISSUED';
  }
  get inRecovery(): boolean {
    return this.status === 'RECOVERY_MONITORING';
  }
  get readyToClose(): boolean {
    return this.status === 'READY_TO_CLOSE';
  }
  get isClosed(): boolean {
    return this.status === 'CLOSED';
  }
}
