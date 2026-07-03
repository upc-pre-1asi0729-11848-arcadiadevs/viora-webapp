/**
 * @file invoice.entity.ts
 * @description Domain entity for a billing-history invoice.
 */
import { formatMoney } from './plan.entity';

export type InvoiceStatus = 'PAID' | 'PENDING' | 'FAILED';

export interface InvoiceProps {
  id?: number | string | null;
  issuedAt?: string | null;
  description?: string;
  amountCents?: number;
  currency?: string;
  status?: InvoiceStatus;
}

export class Invoice {
  readonly id: number | string | null;
  readonly issuedAt: string | null;
  readonly description: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: InvoiceStatus;

  constructor({
    id = null,
    issuedAt = null,
    description = '',
    amountCents = 0,
    currency = 'USD',
    status = 'PENDING',
  }: InvoiceProps = {}) {
    this.id = id;
    this.issuedAt = issuedAt;
    this.description = description;
    this.amountCents = amountCents;
    this.currency = currency;
    this.status = status;
  }

  /** "Jun 01, 2026" issue date. */
  get dateLabel(): string {
    if (!this.issuedAt) {
      return '';
    }
    const date = new Date(this.issuedAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  get amountLabel(): string {
    return formatMoney(this.amountCents, this.currency);
  }

  get statusLabel(): string {
    return this.status.charAt(0) + this.status.slice(1).toLowerCase();
  }

  get isPaid(): boolean {
    return this.status === 'PAID';
  }
}
