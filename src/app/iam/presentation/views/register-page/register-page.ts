import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';
import { SubscriptionStore } from '../../../../billing/application/subscription.store';
import { PlanInterval } from '../../../../billing/domain/model/plan.entity';

type AccountRole = 'ROLE_GROWER' | 'ROLE_SPECIALIST';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './register-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class RegisterPage implements OnDestroy {
  protected readonly auth = inject(AuthStore);
  protected readonly subscription = inject(SubscriptionStore);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The marketing site the "Back" link returns to. */
  protected readonly landingUrl = 'https://viora-website.vercel.app/';

  // Artistic backdrop carousel (shared visual language with the login screen).
  protected readonly activeSlide = signal(0);
  protected readonly typedTitle = signal('');
  protected readonly carouselSlides = [
    { src: '/assets/images/onboarding/carrusel_1.png', titleKey: 'auth.register.slides.s1' },
    { src: '/assets/images/onboarding/carrusel_2.png', titleKey: 'auth.register.slides.s2' },
    { src: '/assets/images/onboarding/carrusel_3.png', titleKey: 'auth.register.slides.s3' },
  ];
  private readonly slideHoldMs = 9000;
  private readonly typeSpeedMs = 55;
  private readonly deleteSpeedMs = 28;
  private cycleTimer: ReturnType<typeof setTimeout> | undefined;
  private typeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly role = signal<AccountRole>('ROLE_GROWER');
  protected readonly referralCode = signal('');

  /** Plan carried from the /plans screen (payment-first onboarding). */
  protected readonly selectedPlan = signal<string | null>(null);
  private selectedInterval: PlanInterval = 'MONTHLY';

  /** Once registered, the page flips to its success / redirecting state. */
  protected readonly submitted = signal(false);
  /** True while we sign in and hand off to the MercadoPago checkout. */
  protected readonly redirecting = signal(false);

  constructor() {
    this.auth.clearMessages();
    const params = this.route.snapshot.queryParamMap;

    // Referral links look like /register?ref=VIORA-XXXXXX — prefill the code.
    const ref = params.get('ref');
    if (ref) {
      this.referralCode.set(ref.toUpperCase());
    }

    // Plan links from /plans carry the chosen role + plan + interval. The role is
    // then fixed (it's part of the plan the user picked).
    const role = params.get('role');
    if (role === 'ROLE_SPECIALIST' || role === 'ROLE_GROWER') {
      this.role.set(role);
    }
    const plan = params.get('plan');
    if (plan) {
      this.selectedPlan.set(plan);
      this.selectedInterval = params.get('interval') === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
      // Only animate once we know we're staying on this screen.
      this.typeIn(this.titleTextAt(0), () => this.scheduleNextSlide());
    } else {
      // Payment-first: you can't register without first choosing a plan. Send the
      // visitor to the plan-selection screen (carry any referral code along).
      this.router.navigate(['/plans'], {
        queryParams: ref ? { ref } : {},
        replaceUrl: true,
      });
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ----- Backdrop carousel + typewriter headline -----

  protected selectSlide(index: number): void {
    if (index === this.activeSlide()) {
      return;
    }
    this.clearTimers();
    this.transitionTo(index);
  }

  private titleTextAt(index: number): string {
    return this.translate.instant(this.carouselSlides[index].titleKey);
  }

  private scheduleNextSlide(): void {
    this.cycleTimer = setTimeout(() => {
      const next = (this.activeSlide() + 1) % this.carouselSlides.length;
      this.transitionTo(next);
    }, this.slideHoldMs);
  }

  private transitionTo(index: number): void {
    this.deleteAll(() => {
      this.activeSlide.set(index);
      this.typeIn(this.titleTextAt(index), () => this.scheduleNextSlide());
    });
  }

  private deleteAll(done: () => void): void {
    const step = () => {
      const current = this.typedTitle();
      if (current.length === 0) {
        done();
        return;
      }
      this.typedTitle.set(current.slice(0, -1));
      this.typeTimer = setTimeout(step, this.deleteSpeedMs);
    };
    step();
  }

  private typeIn(target: string, done?: () => void): void {
    this.typedTitle.set('');
    let count = 0;
    const step = () => {
      count += 1;
      this.typedTitle.set(target.slice(0, count));
      if (count >= target.length) {
        done?.();
        return;
      }
      this.typeTimer = setTimeout(step, this.typeSpeedMs);
    };
    step();
  }

  private clearTimers(): void {
    if (this.cycleTimer !== undefined) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = undefined;
    }
    if (this.typeTimer !== undefined) {
      clearTimeout(this.typeTimer);
      this.typeTimer = undefined;
    }
  }

  /** The role is locked when the user arrived from the plan-selection screen. */
  protected get roleLocked(): boolean {
    return this.selectedPlan() !== null;
  }

  protected selectRole(role: AccountRole): void {
    if (this.roleLocked) {
      return;
    }
    this.role.set(role);
  }

  protected get isSpecialist(): boolean {
    return this.role() === 'ROLE_SPECIALIST';
  }

  /** A specialist's phone is their producer-facing contact, so it's mandatory. */
  protected get phoneRequired(): boolean {
    return this.isSpecialist;
  }

  protected get passwordsMismatch(): boolean {
    return this.confirmPassword().length > 0 && this.password() !== this.confirmPassword();
  }

  protected get canSubmit(): boolean {
    return (
      this.fullName().trim().length > 1 &&
      this.email().trim().length > 3 &&
      this.password().length >= 8 &&
      this.password() === this.confirmPassword() &&
      (!this.phoneRequired || this.phone().trim().length > 0) &&
      !this.auth.busy()
    );
  }

  protected submit(): void {
    if (!this.canSubmit) {
      return;
    }
    const email = this.email().trim().toLowerCase();
    const password = this.password();
    this.auth.signUp(
      {
        email,
        password,
        role: this.role(),
        fullName: this.fullName().trim(),
        phone: this.phone().trim() || null,
        referralCode: this.referralCode().trim() || null,
      },
      (ok) => {
        if (!ok) {
          return;
        }
        const plan = this.selectedPlan();
        if (plan) {
          // Payment-first: sign in silently, then hand off to MercadoPago checkout.
          this.redirecting.set(true);
          this.auth.signInForCheckout(email, password, (signedIn) => {
            if (signedIn) {
              this.subscription.startCheckout(plan, this.selectedInterval, () =>
                this.redirecting.set(false),
              );
            } else {
              this.redirecting.set(false);
            }
          });
        } else {
          // Fallback (direct /register without a plan): show the success state.
          this.submitted.set(true);
        }
      },
    );
  }

  protected resend(): void {
    this.auth.resendVerification(this.email());
  }
}
