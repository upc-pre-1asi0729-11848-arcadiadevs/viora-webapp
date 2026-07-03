/**
 * @file plan.entity.ts
 * @description Domain entity for a subscription plan (Subscription, Billing &
 * Referral). Amounts are stored in minor units (cents).
 */
export type PlanInterval = 'MONTHLY' | 'ANNUAL';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PEN: 'S/',
  ARS: '$',
  MXN: '$',
  BRL: 'R$',
  COP: '$',
  CLP: '$',
};

/** "$ 149,00" formatting shared by plans, subscription and invoices. */
export function formatMoney(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? '$';
  const amount = (cents / 100).toFixed(2).replace('.', ',');
  return `${symbol} ${amount}`;
}

export interface PlanProps {
  id?: number | string | null;
  code?: string;
  name?: string;
  priceCents?: number;
  currency?: string;
  interval?: PlanInterval;
  tagline?: string;
  features?: string[];
  plotLimit?: number;
  iotLimit?: number;
}

export class Plan {
  readonly id: number | string | null;
  readonly code: string;
  readonly name: string;
  readonly priceCents: number;
  readonly currency: string;
  readonly interval: PlanInterval;
  readonly tagline: string;
  readonly features: string[];
  readonly plotLimit: number;
  readonly iotLimit: number;

  constructor({
    id = null,
    code = '',
    name = '',
    priceCents = 0,
    currency = 'USD',
    interval = 'MONTHLY',
    tagline = '',
    features = [],
    plotLimit = 0,
    iotLimit = 0,
  }: PlanProps = {}) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.priceCents = priceCents;
    this.currency = currency;
    this.interval = interval;
    this.tagline = tagline;
    this.features = features;
    this.plotLimit = plotLimit;
    this.iotLimit = iotLimit;
  }

  /** "$ 149,00" price. */
  get priceLabel(): string {
    return formatMoney(this.priceCents, this.currency);
  }

  /** "/ month" or "/ year" suffix. */
  get intervalSuffix(): string {
    return this.interval === 'ANNUAL' ? '/ year' : '/ month';
  }

  get isAnnual(): boolean {
    return this.interval === 'ANNUAL';
  }
}
