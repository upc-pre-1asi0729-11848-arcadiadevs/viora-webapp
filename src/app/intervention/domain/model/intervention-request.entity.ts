/**
 * @file intervention-request.entity.ts
 * @description Domain entity for an intervention (expert assistance) request.
 */
export type InterventionRequestStatus =
  | 'PENDING'
  | 'AWAITING_RESPONSE'
  | 'PROPOSAL_RECEIVED'
  | 'ACCEPTED'
  | 'DECLINED';

export interface InterventionRequestProps {
  id?: number | string | null;
  referenceCode?: string;
  growerId?: number | null;
  plotId?: number | null;
  specialistId?: number | null;
  alertId?: number | null;
  reason?: string;
  message?: string;
  status?: InterventionRequestStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Producer-facing labels for each backend status. */
const STATUS_LABELS: Record<InterventionRequestStatus, string> = {
  PENDING: 'Pending response',
  AWAITING_RESPONSE: 'Awaiting response',
  PROPOSAL_RECEIVED: 'Proposal received',
  ACCEPTED: 'Accepted',
  DECLINED: 'Rejected',
};

export class InterventionRequest {
  readonly id: number | string | null;
  readonly referenceCode: string;
  readonly growerId: number | null;
  readonly plotId: number | null;
  readonly specialistId: number | null;
  readonly alertId: number | null;
  readonly reason: string;
  readonly message: string;
  readonly status: InterventionRequestStatus;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;

  constructor({
    id = null,
    referenceCode = '',
    growerId = null,
    plotId = null,
    specialistId = null,
    alertId = null,
    reason = '',
    message = '',
    status = 'PENDING',
    createdAt = null,
    updatedAt = null,
  }: InterventionRequestProps = {}) {
    this.id = id;
    this.referenceCode = referenceCode;
    this.growerId = growerId;
    this.plotId = plotId;
    this.specialistId = specialistId;
    this.alertId = alertId;
    this.reason = reason;
    this.message = message;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  get statusLabel(): string {
    return STATUS_LABELS[this.status] ?? this.status;
  }

  /** Whether the case is still waiting on the specialist. */
  get isPending(): boolean {
    return this.status === 'PENDING' || this.status === 'AWAITING_RESPONSE';
  }

  /** Relative "N min ago" / dated label for the "Last update" column. */
  get lastUpdateLabel(): string {
    const raw = this.updatedAt ?? this.createdAt;
    if (!raw) {
      return '—';
    }

    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      return '—';
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }
    if (diffMinutes < 60 * 24) {
      return `${Math.round(diffMinutes / 60)} h ago`;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(timestamp));
  }
}
