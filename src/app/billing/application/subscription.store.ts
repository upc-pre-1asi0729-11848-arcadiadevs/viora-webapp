/**
 * Application service store for the Subscription slice of the Billing bounded
 * context. Backs the Subscription screen with the user's real plan, invoices and
 * payment method, and drives the MercadoPago checkout / cancel flows.
 *
 * @module SubscriptionStore
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { SubscriptionApiService } from '../infrastructure/subscription-api.service';
import { Plan, PlanInterval } from '../domain/model/plan.entity';
import { Subscription } from '../domain/model/subscription.entity';
import { Invoice } from '../domain/model/invoice.entity';
import { PaymentMethod } from '../domain/model/payment-method.entity';

@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly api = inject(SubscriptionApiService);

  private readonly subscriptionSignal = signal<Subscription | null>(null);
  private readonly plansSignal = signal<Plan[]>([]);
  private readonly invoicesSignal = signal<Invoice[]>([]);
  private readonly paymentMethodsSignal = signal<PaymentMethod[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly checkoutPendingSignal = signal<string | null>(null);
  private readonly cancelingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly subscription = this.subscriptionSignal.asReadonly();
  readonly plans = this.plansSignal.asReadonly();
  readonly invoices = this.invoicesSignal.asReadonly();
  readonly paymentMethods = this.paymentMethodsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly checkoutPending = this.checkoutPendingSignal.asReadonly();
  readonly canceling = this.cancelingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** The default (or only) payment method on file. */
  readonly defaultPaymentMethod = computed<PaymentMethod | null>(() => {
    const methods = this.paymentMethodsSignal();
    return methods.find((m) => m.isDefault) ?? methods[0] ?? null;
  });

  /** The plan matching the active subscription. */
  readonly currentPlan = computed<Plan | null>(() => {
    const sub = this.subscriptionSignal();
    if (!sub) {
      return null;
    }
    return this.plansSignal().find((p) => p.code === sub.planCode) ?? null;
  });

  /** Loads every dataset the Subscription screen needs. */
  load(): void {
    this.loadingSignal.set(true);
    this.api.getPlans().subscribe({
      next: (plans) => this.plansSignal.set(plans),
      error: () => {},
    });
    this.api.getInvoices().subscribe({
      next: (invoices) => this.invoicesSignal.set(invoices),
      error: () => {},
    });
    this.api.getPaymentMethods().subscribe({
      next: (methods) => this.paymentMethodsSignal.set(methods),
      error: () => {},
    });
    this.api
      .getSubscription()
      .pipe(finalize(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (sub) => this.subscriptionSignal.set(sub),
        error: () => {},
      });
  }

  /**
   * Opens a MercadoPago checkout for the target plan and redirects the browser
   * to the hosted checkout on success.
   */
  startCheckout(planCode: string, interval: PlanInterval, onError?: () => void): void {
    this.checkoutPendingSignal.set(planCode);
    this.errorSignal.set(null);
    this.api
      .checkout(planCode, interval)
      .pipe(finalize(() => this.checkoutPendingSignal.set(null)))
      .subscribe({
        next: (session) => {
          if (session?.checkoutUrl) {
            window.location.href = session.checkoutUrl;
          } else {
            this.errorSignal.set('Could not open the payment checkout.');
            onError?.();
          }
        },
        error: (err) => {
          this.errorSignal.set(
            err?.error?.message ?? 'Payments are not available yet. Please try again later.',
          );
          onError?.();
        },
      });
  }

  /** Cancels the subscription at period end. */
  cancel(onDone?: (ok: boolean) => void): void {
    this.cancelingSignal.set(true);
    this.api
      .cancel()
      .pipe(finalize(() => this.cancelingSignal.set(false)))
      .subscribe({
        next: (sub) => {
          this.subscriptionSignal.set(sub);
          onDone?.(true);
        },
        error: () => onDone?.(false),
      });
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
