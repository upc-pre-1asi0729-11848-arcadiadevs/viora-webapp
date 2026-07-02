/**
 * Application service store for the `Billing` bounded context (Subscription,
 * Billing & Referral). Backs the Settings › Referrals tab with the active user's
 * real referral code and coupons.
 *
 * @module BillingStore
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { BillingApiService } from '../infrastructure/billing-api.service';
import { ReferralCode } from '../domain/model/referral-code.entity';
import { Coupon } from '../domain/model/coupon.entity';

@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly api = inject(BillingApiService);

  private readonly referralCodeSignal = signal<ReferralCode>(new ReferralCode());
  private readonly couponsSignal = signal<Coupon[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly redeemingSignal = signal<boolean>(false);
  private readonly redeemErrorSignal = signal<string | null>(null);

  readonly referralCode = this.referralCodeSignal.asReadonly();
  readonly coupons = this.couponsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly redeeming = this.redeemingSignal.asReadonly();
  readonly redeemError = this.redeemErrorSignal.asReadonly();

  readonly hasCoupons = computed<boolean>(() => this.couponsSignal().length > 0);

  /** Loads the referral code and coupons for the active user. */
  load(): void {
    this.loadingSignal.set(true);
    this.api.getReferralCode().subscribe({
      next: (code) => this.referralCodeSignal.set(code),
      error: () => {},
    });
    this.api
      .getCoupons()
      .pipe(finalize(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (coupons) => this.couponsSignal.set(coupons),
        error: () => {},
      });
  }

  /** Redeems a coupon by code, refreshing the list on success. */
  redeem(code: string, onDone?: (ok: boolean) => void): void {
    this.redeemingSignal.set(true);
    this.redeemErrorSignal.set(null);
    this.api
      .redeemCoupon(code)
      .pipe(finalize(() => this.redeemingSignal.set(false)))
      .subscribe({
        next: (coupon) => {
          this.couponsSignal.update((coupons) => [...coupons, coupon]);
          onDone?.(true);
        },
        error: (err) => {
          this.redeemErrorSignal.set(
            err?.error?.message ?? 'That coupon code is not valid or already in your account.',
          );
          onDone?.(false);
        },
      });
  }

  clearRedeemError(): void {
    this.redeemErrorSignal.set(null);
  }
}
