import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { Plan, PlanInterval } from '../domain/model/plan.entity';
import { Subscription } from '../domain/model/subscription.entity';
import { Invoice } from '../domain/model/invoice.entity';
import { PaymentMethod } from '../domain/model/payment-method.entity';
import {
  CheckoutResource,
  InvoiceAssembler,
  InvoiceResource,
  PaymentMethodAssembler,
  PaymentMethodResource,
  PlanAssembler,
  PlanResource,
  SubscriptionAssembler,
  SubscriptionResource,
} from './subscription-response';

/**
 * Infrastructure gateway for the Subscription slice of the Billing bounded
 * context, served by the real Viora Platform backend. Plan changes open a
 * MercadoPago hosted checkout; reads (plan, invoices, payment method) are real.
 *
 * @class SubscriptionApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionApiService extends BaseApi {
  private readonly plansEndpoint = this.endpoint(environment.endpoints.plans);
  private readonly subscriptionsEndpoint = this.endpoint(environment.endpoints.subscriptions);
  private readonly invoicesEndpoint = this.endpoint(environment.endpoints.invoices);
  private readonly paymentMethodsEndpoint = this.endpoint(environment.endpoints.paymentMethods);

  getPlans(): Observable<Plan[]> {
    return this.http
      .get<PlanResource[]>(this.plansEndpoint.collectionUrl)
      .pipe(map((resources) => PlanAssembler.toEntities(resources ?? [])));
  }

  getSubscription(): Observable<Subscription> {
    return this.http
      .get<SubscriptionResource>(this.subscriptionsEndpoint.resourceUrl(this.defaultUserId))
      .pipe(map((resource) => SubscriptionAssembler.toEntity(resource)));
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http
      .get<InvoiceResource[]>(this.invoicesEndpoint.collectionUrl, {
        params: this.queryParams({ userId: this.defaultUserId }),
      })
      .pipe(map((resources) => InvoiceAssembler.toEntities(resources ?? [])));
  }

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http
      .get<PaymentMethodResource[]>(this.paymentMethodsEndpoint.collectionUrl, {
        params: this.queryParams({ userId: this.defaultUserId }),
      })
      .pipe(map((resources) => PaymentMethodAssembler.toEntities(resources ?? [])));
  }

  /** Opens a MercadoPago checkout for the target plan; returns the redirect URL. */
  checkout(planCode: string, interval: PlanInterval): Observable<CheckoutResource> {
    return this.http.post<CheckoutResource>(
      `${this.subscriptionsEndpoint.resourceUrl(this.defaultUserId)}/checkout`,
      { planCode, interval },
    );
  }

  /** Cancels the subscription at period end. */
  cancel(): Observable<Subscription> {
    return this.http
      .post<SubscriptionResource>(
        `${this.subscriptionsEndpoint.resourceUrl(this.defaultUserId)}/cancel`,
        {},
      )
      .pipe(map((resource) => SubscriptionAssembler.toEntity(resource)));
  }
}
