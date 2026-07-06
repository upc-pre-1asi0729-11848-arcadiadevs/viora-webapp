import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { ActiveSessionService } from '../../../../shared/infrastructure/active-session.service';

import { SubscriptionStore } from '../../../application/subscription.store';
import { Plan } from '../../../domain/model/plan.entity';

@Component({
  selector: 'app-subscription-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './subscription-overview.html',
  styleUrl: './subscription-overview.css',
})
export class SubscriptionOverviewView implements OnInit {
  protected readonly store = inject(SubscriptionStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly session = inject(ActiveSessionService);
  private readonly route = inject(ActivatedRoute);

  /** Result banner shown when MercadoPago redirects back after a payment. */
  protected readonly paymentResult = signal<'approved' | 'pending' | 'failure' | null>(null);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Subscription', labelKey: 'subscriptionPage.breadcrumb.subscription', disabled: true },
    { label: 'Overview', labelKey: 'subscriptionPage.breadcrumb.overview', disabled: true },
  ];

  // Real usage, derived from My Plots / IoT devices.
  protected readonly plotsUsed = signal(0);
  protected readonly iotUsed = signal(0);

  // Modal state.
  protected readonly confirmPlan = signal<Plan | null>(null);
  protected readonly cancelModalOpen = signal(false);
  protected readonly paymentModalOpen = signal(false);
  protected readonly isSpecialist = this.session.isSpecialist;

  /**
   * The plans for the signed-in user's segment only — a specialist sees the
   * `specialist-*` plans (S/79 / S/790), a grower the `grower-*` plans. Without
   * this filter the catalog leaked the other segment's plans into the list.
   */
  protected readonly visiblePlans = computed<Plan[]>(() => {
    const prefix = this.isSpecialist() ? 'specialist-' : 'grower-';
    return this.store.plans().filter((plan) => plan.code.startsWith(prefix));
  });

  protected readonly plotUsagePct = computed<number>(() => {
    const limit = this.store.currentPlan()?.plotLimit ?? 0;
    return limit > 0 ? Math.min(100, Math.round((this.plotsUsed() / limit) * 100)) : 0;
  });

  protected readonly iotUsagePct = computed<number>(() => {
    const limit = this.store.currentPlan()?.iotLimit ?? 0;
    return limit > 0 ? Math.min(100, Math.round((this.iotUsed() / limit) * 100)) : 0;
  });

  /** The annual plan offered for the "Switch to annual" shortcut (own segment). */
  protected readonly annualPlan = computed<Plan | null>(
    () => this.visiblePlans().find((p) => p.interval === 'ANNUAL') ?? null,
  );

  protected readonly currentPlanName = computed<string>(() => {
    const plan = this.store.currentPlan();
    const subscription = this.store.subscription();
    if (this.isSpecialist()) {
      if (plan) {
        return this.specialistPlanName(plan);
      }
      if (subscription?.planName) {
        return this.specialistPlanNameFromParts(
          subscription.planCode,
          subscription.planName,
          subscription.interval,
        );
      }
    }
    return subscription?.planName || plan?.name || '';
  });

  protected readonly proBadgeStatus = computed<string>(() => {
    if (!this.store.subscription() && !this.store.currentPlan()) {
      return 'subscriptionPage.specialist.noDataYet';
    }
    return this.isSpecialistProPlan()
      ? 'subscriptionPage.specialist.proBadgeReady'
      : 'subscriptionPage.specialist.proBadgeLocked';
  });

  protected readonly isSpecialistProPlan = computed<boolean>(() => {
    const plan = this.store.currentPlan();
    const subscription = this.store.subscription();
    return (
      this.isProPlan(plan?.code, plan?.name) ||
      this.isProPlan(subscription?.planCode, subscription?.planName)
    );
  });

  ngOnInit(): void {
    this.store.load();
    if (!this.isSpecialist()) {
      this.loadUsage();
    }
    this.readPaymentReturn();
  }

  /** Reads MercadoPago's redirect status (approved/pending/failure) if present. */
  private readPaymentReturn(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status') ?? params.get('collection_status');
    if (status === 'approved' || status === 'success') {
      this.paymentResult.set('approved');
    } else if (status === 'pending' || status === 'in_process') {
      this.paymentResult.set('pending');
    } else if (status === 'failure' || status === 'rejected') {
      this.paymentResult.set('failure');
    }
  }

  protected dismissPaymentResult(): void {
    this.paymentResult.set(null);
  }

  protected refresh(): void {
    this.store.load();
    if (!this.isSpecialist()) {
      this.loadUsage();
    }
  }

  private loadUsage(): void {
    this.agronomicApi.getPlots().subscribe((plots) => this.plotsUsed.set(plots.length));
    this.agronomicApi.getIotDevices().subscribe((devices) => this.iotUsed.set(devices.length));
  }

  protected isCurrentPlan(plan: Plan): boolean {
    return this.store.subscription()?.planCode === plan.code;
  }

  protected displayPlanName(plan: Plan): string {
    return this.isSpecialist() ? this.specialistPlanName(plan) : plan.name;
  }

  protected displayPlanTagline(plan: Plan): string {
    if (!this.isSpecialist()) {
      return plan.tagline;
    }
    return plan.isAnnual
      ? 'subscriptionPage.specialist.proTagline'
      : 'subscriptionPage.specialist.plusTagline';
  }

  protected planFeatureKeys(plan: Plan): string[] {
    if (!this.isSpecialist()) {
      return [];
    }
    const features = [
      'subscriptionPage.specialist.features.opportunityFeed',
      'subscriptionPage.specialist.features.prescriptions',
      'subscriptionPage.specialist.features.visibility',
      'subscriptionPage.specialist.features.fieldContext',
      'subscriptionPage.specialist.features.fasterConnection',
    ];
    if (this.isProPlan(plan.code, plan.name)) {
      features.push('subscriptionPage.specialist.features.proBadge');
    }
    return features;
  }

  // ----- Plan switching -----

  protected openSwitch(plan: Plan): void {
    this.store.clearError();
    this.confirmPlan.set(plan);
  }

  protected switchToAnnual(): void {
    const plan = this.annualPlan();
    if (plan) {
      this.openSwitch(plan);
    }
  }

  protected closeSwitch(): void {
    this.confirmPlan.set(null);
  }

  protected confirmSwitch(): void {
    const plan = this.confirmPlan();
    if (plan) {
      this.store.startCheckout(plan.code, plan.interval);
    }
  }

  protected scrollToPlans(): void {
    document
      .getElementById('available-plans')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ----- Cancel -----

  protected openCancel(): void {
    this.cancelModalOpen.set(true);
  }

  protected closeCancel(): void {
    this.cancelModalOpen.set(false);
  }

  protected confirmCancel(): void {
    this.store.cancel((ok) => {
      if (ok) {
        this.cancelModalOpen.set(false);
      }
    });
  }

  // ----- Payment method -----

  protected openPayment(): void {
    this.paymentModalOpen.set(true);
  }

  protected closePayment(): void {
    this.paymentModalOpen.set(false);
  }

  private specialistPlanName(plan: Plan): string {
    return this.specialistPlanNameFromParts(plan.code, plan.name, plan.interval);
  }

  private specialistPlanNameFromParts(code = '', name = '', interval = 'MONTHLY'): string {
    return this.isProPlan(code, name) || interval === 'ANNUAL'
      ? 'Specialist Pro'
      : 'Specialist Plus';
  }

  private isProPlan(code?: string, name?: string): boolean {
    const value = `${code ?? ''} ${name ?? ''}`.toLowerCase();
    return value.includes('pro');
  }
}
