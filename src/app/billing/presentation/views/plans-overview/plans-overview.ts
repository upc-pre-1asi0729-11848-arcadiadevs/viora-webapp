import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SubscriptionApiService } from '../../../infrastructure/subscription-api.service';
import { SubscriptionStore } from '../../../application/subscription.store';
import { Plan } from '../../../domain/model/plan.entity';
import { ActiveSessionService } from '../../../../shared/infrastructure/active-session.service';
import { AuthStore } from '../../../../iam/application/auth.store';

type PlanSegment = 'grower' | 'specialist';

/**
 * Public plan-selection screen — the entry point of the payment-first onboarding.
 * A perspective switch flips between the Grower and Specialist catalogs (each with
 * a monthly "Plus" and an annual "Pro" plan). Choosing a plan carries the role +
 * plan + interval into registration, which then opens the MercadoPago checkout.
 */
@Component({
  selector: 'app-plans-overview',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './plans-overview.html',
  styleUrl: './plans-overview.css',
})
export class PlansOverviewView implements OnInit {
  private readonly api = inject(SubscriptionApiService);
  private readonly subscription = inject(SubscriptionStore);
  private readonly session = inject(ActiveSessionService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The public marketing site the landing CTAs come from. */
  protected readonly landingUrl = 'https://viora-website.vercel.app/';

  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly segment = signal<PlanSegment>('grower');
  /** True while we hand off to the MercadoPago checkout. */
  protected readonly redirecting = signal<boolean>(false);

  /** Whether a stale/active session is present (already has an account). */
  protected readonly isSignedIn = this.session.isAuthenticated;
  protected readonly checkoutError = this.subscription.error;

  protected readonly isSpecialist = computed<boolean>(() => this.segment() === 'specialist');

  /** The two plans for the active segment, monthly (Plus) first. */
  protected readonly segmentPlans = computed<Plan[]>(() => {
    const prefix = this.isSpecialist() ? 'specialist-' : 'grower-';
    return this.plans()
      .filter((plan) => plan.code.startsWith(prefix))
      .sort((a, b) => (a.isAnnual === b.isAnnual ? 0 : a.isAnnual ? 1 : -1));
  });

  protected readonly characterSrc = computed<string>(() =>
    this.isSpecialist()
      ? '/assets/images/general/phytosanitary-specialist-character-2.png'
      : '/assets/images/general/olive-producer-character-2.png',
  );

  ngOnInit(): void {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'ROLE_SPECIALIST' || role === 'specialist') {
      this.segment.set('specialist');
    }
    this.api.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectSegment(segment: PlanSegment): void {
    this.segment.set(segment);
  }

  /**
   * Continues with the chosen plan. A fresh visitor goes to registration first;
   * a visitor who already has an account (a session is present) skips straight to
   * the MercadoPago checkout — this also frees an account that signed up but never
   * paid from being pinned to this screen.
   */
  protected choose(plan: Plan): void {
    if (this.isSignedIn()) {
      this.redirecting.set(true);
      this.subscription.startCheckout(plan.code, plan.interval, () => this.redirecting.set(false));
      return;
    }
    this.router.navigate(['/register'], {
      queryParams: {
        role: this.isSpecialist() ? 'ROLE_SPECIALIST' : 'ROLE_GROWER',
        plan: plan.code,
        interval: plan.interval,
      },
    });
  }

  /** Signs the current (unpaid) account out so a different account can be used. */
  protected logout(): void {
    this.auth.logout();
  }
}
