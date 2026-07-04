import { ReferralCode } from '../domain/model/referral-code.entity';
import { Coupon } from '../domain/model/coupon.entity';

/** Backend resource shape for `GET /referrals/{userId}`. */
export interface ReferralCodeResource {
  userId: number | null;
  code: string | null;
  rewardPercent: number | null;
}

/** Backend resource shape for `GET /coupons?userId=` items. */
export interface CouponResource {
  id: number | null;
  code: string | null;
  description: string | null;
  discountPercent: number | null;
  validUntil: string | null;
  conditions: string | null;
}

/** Request body for `POST /coupon-redemptions` (the user comes from the token). */
export interface RedeemCouponRequest {
  code: string;
}

export class ReferralCodeAssembler {
  static toEntityFromResource(resource: ReferralCodeResource): ReferralCode {
    return new ReferralCode({
      userId: resource.userId ?? null,
      code: resource.code ?? '',
      rewardPercent: resource.rewardPercent ?? 0,
    });
  }
}

export class CouponAssembler {
  static toEntityFromResource(resource: CouponResource): Coupon {
    return new Coupon({
      id: resource.id ?? null,
      code: resource.code ?? '',
      description: resource.description ?? '',
      discountPercent: resource.discountPercent ?? 0,
      validUntil: resource.validUntil ?? null,
      conditions: resource.conditions ?? '',
    });
  }

  static toEntitiesFromResources(resources: CouponResource[]): Coupon[] {
    return resources.map((resource) => CouponAssembler.toEntityFromResource(resource));
  }
}
