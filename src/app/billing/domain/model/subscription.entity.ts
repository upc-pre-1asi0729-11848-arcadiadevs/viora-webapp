/**
 * @file subscription.entity.ts
 * @description Domain entity for a user's subscription.
 */
import { PlanInterval, formatMoney } from './plan.entity';

export type SubscriptionStatus = 'ACTIVE' | 'PENDING' | 'CANCELED';

export interface SubscriptionProps {
  userId?: number | string | null;
  planCode?: string;
  planName?: string;
  interval?: PlanInterval;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  priceCents?: number;
  currency?: string;
}

export class Subscription {
  readonly userId: number | string | null;
  readonly planCode: string;
  readonly planName: string;
  readonly interval: PlanInterval;
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: string | null;
  readonly priceCents: number;
  readonly currency: string;

  constructor({
    userId = null,
    planCode = '',
    planName = '',
    interval = 'MONTHLY',
    status = 'ACTIVE',
    currentPeriodEnd = null,
    priceCents = 0,
    currency = 'USD',
  }: SubscriptionProps = {}) {
    this.userId = userId;
    this.planCode = planCode;
    this.planName = planName;
    this.interval = interval;
    this.status = status;
    this.currentPeriodEnd = currentPeriodEnd;
    this.priceCents = priceCents;
    this.currency = currency;
  }

  get isAnnual(): boolean {
    return this.interval === 'ANNUAL';
  }

  get isCanceled(): boolean {
    return this.status === 'CANCELED';
  }

  get priceLabel(): string {
    return formatMoney(this.priceCents, this.currency);
  }

  get intervalSuffix(): string {
    return this.isAnnual ? '/ year' : '/ month';
  }

  /** "Jul 01, 2026" renewal date. */
  get periodEndLabel(): string {
    if (!this.currentPeriodEnd) {
      return '';
    }
    const date = new Date(this.currentPeriodEnd);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  /** "Renews Jul 01, 2026 · monthly billing" caption. */
  get renewalCaption(): string {
    const cadence = this.isAnnual ? 'annual billing' : 'monthly billing';
    const verb = this.isCanceled ? 'Ends' : 'Renews';
    return this.periodEndLabel ? `${verb} ${this.periodEndLabel} · ${cadence}` : cadence;
  }
}
