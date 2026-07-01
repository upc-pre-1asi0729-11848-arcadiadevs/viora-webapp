/**
 * @file service-proposal.entity.ts
 * @description Domain entity for a service proposal submitted by a specialist in
 * response to an intervention request.
 */
export type ServiceProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ServiceProposalProps {
  id?: number | string | null;
  interventionRequestId?: number | null;
  specialistId?: number | null;
  serviceTitle?: string;
  durationLabel?: string;
  scope?: string[];
  proposedDate?: string | null;
  amount?: number | null;
  currency?: string | null;
  proposalDetails?: string;
  status?: ServiceProposalStatus;
}

/** Currency symbols for the amounts the backend returns (defaults to the code). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  PEN: 'S/',
  USD: '$',
  EUR: '€',
};

export class ServiceProposal {
  readonly id: number | string | null;
  readonly interventionRequestId: number | null;
  readonly specialistId: number | null;
  readonly serviceTitle: string;
  readonly durationLabel: string;
  readonly scope: string[];
  readonly proposedDate: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly proposalDetails: string;
  readonly status: ServiceProposalStatus;

  constructor({
    id = null,
    interventionRequestId = null,
    specialistId = null,
    serviceTitle = '',
    durationLabel = '',
    scope = [],
    proposedDate = null,
    amount = null,
    currency = null,
    proposalDetails = '',
    status = 'PENDING',
  }: ServiceProposalProps = {}) {
    this.id = id;
    this.interventionRequestId = interventionRequestId;
    this.specialistId = specialistId;
    this.serviceTitle = serviceTitle;
    this.durationLabel = durationLabel;
    this.scope = scope;
    this.proposedDate = proposedDate;
    this.amount = amount;
    this.currency = currency;
    this.proposalDetails = proposalDetails;
    this.status = status;
  }

  /** Amount formatted with its currency symbol, e.g. "S/ 280.00". */
  get costLabel(): string {
    if (this.amount == null) {
      return '—';
    }
    const symbol = this.currency ? CURRENCY_SYMBOLS[this.currency] ?? this.currency : '';
    return `${symbol} ${this.amount.toFixed(2)}`.trim();
  }

  /** Proposed visit date as a "MMM DD, YYYY" label. */
  get proposedDateLabel(): string {
    return ServiceProposal.formatDate(this.proposedDate);
  }

  static formatDate(raw: string | null): string {
    if (!raw) {
      return '—';
    }
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(timestamp));
  }
}
