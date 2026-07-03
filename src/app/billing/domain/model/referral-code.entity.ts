/**
 * @file referral-code.entity.ts
 * @description Domain entity for a user's personal referral code (Subscription,
 * Billing & Referral). Shared as a link/code; when an invited partner registers,
 * the referrer becomes eligible for the reward coupon.
 */
export interface ReferralCodeProps {
  userId?: number | string | null;
  code?: string;
  rewardPercent?: number;
}

export class ReferralCode {
  readonly userId: number | string | null;
  readonly code: string;
  readonly rewardPercent: number;

  constructor({ userId = null, code = '', rewardPercent = 0 }: ReferralCodeProps = {}) {
    this.userId = userId;
    this.code = code;
    this.rewardPercent = rewardPercent;
  }

  /** "20% discount coupon" reward caption. */
  get rewardLabel(): string {
    return `${this.rewardPercent}% discount coupon`;
  }

  /** Shareable registration link carrying the referral code. */
  get shareLink(): string {
    return `https://viora.app/register?ref=${encodeURIComponent(this.code)}`;
  }
}
