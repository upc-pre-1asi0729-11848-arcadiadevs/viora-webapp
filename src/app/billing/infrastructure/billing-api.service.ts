import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { ReferralCode } from '../domain/model/referral-code.entity';
import { Coupon } from '../domain/model/coupon.entity';
import {
  CouponAssembler,
  CouponResource,
  ReferralCodeAssembler,
  ReferralCodeResource,
} from './billing-response';

/**
 * Infrastructure gateway for the Billing bounded context (Subscription, Billing &
 * Referral), served by the real Viora Platform backend. Exposes the active user's
 * referral code and the coupons they hold / can redeem.
 *
 * @class BillingApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class BillingApiService extends BaseApi {
  private readonly referralsEndpoint = this.endpoint(environment.endpoints.referrals);
  private readonly couponsEndpoint = this.endpoint(environment.endpoints.coupons);
  private readonly couponRedemptionsEndpoint = this.endpoint(
    environment.endpoints.couponRedemptions,
  );

  /** Fetches (or provisions on first access) the active user's referral code. */
  getReferralCode(): Observable<ReferralCode> {
    return this.http
      .get<ReferralCodeResource>(this.referralsEndpoint.resourceUrl(this.defaultUserId))
      .pipe(map((resource) => ReferralCodeAssembler.toEntityFromResource(resource)));
  }

  /** Lists the coupons the active user holds. */
  getCoupons(): Observable<Coupon[]> {
    return this.http
      .get<CouponResource[]>(this.couponsEndpoint.collectionUrl, {
        params: this.queryParams({ userId: this.defaultUserId }),
      })
      .pipe(map((resources) => CouponAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /** Redeems a coupon by code for the active user. Errors are surfaced to callers. */
  redeemCoupon(code: string): Observable<Coupon> {
    return this.http
      .post<CouponResource>(this.couponRedemptionsEndpoint.collectionUrl, {
        userId: this.defaultUserId,
        code,
      })
      .pipe(map((resource) => CouponAssembler.toEntityFromResource(resource)));
  }
}
