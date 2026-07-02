/**
 * @file coupon.entity.ts
 * @description Domain entity for a discount coupon the user holds (Subscription,
 * Billing & Referral). Granted (e.g. the referral reward) or redeemed by code,
 * and later applied against a subscription.
 */
export interface CouponProps {
  id?: number | string | null;
  code?: string;
  description?: string;
  discountPercent?: number;
  /** ISO timestamp of the expiry, or null when the coupon never expires. */
  validUntil?: string | null;
  conditions?: string;
}

export class Coupon {
  readonly id: number | string | null;
  readonly code: string;
  readonly description: string;
  readonly discountPercent: number;
  readonly validUntil: string | null;
  readonly conditions: string;

  constructor({
    id = null,
    code = '',
    description = '',
    discountPercent = 0,
    validUntil = null,
    conditions = '',
  }: CouponProps = {}) {
    this.id = id;
    this.code = code;
    this.description = description;
    this.discountPercent = discountPercent;
    this.validUntil = validUntil;
    this.conditions = conditions;
  }

  /** "Valid until 30/7/2026" caption; empty when there is no expiry. */
  get validUntilLabel(): string {
    if (!this.validUntil) {
      return '';
    }
    const date = new Date(this.validUntil);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `Valid until ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
}
