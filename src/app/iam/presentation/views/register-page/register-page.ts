import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthLanguageToggle } from '../../../../shared/presentation/components/auth-language-toggle/auth-language-toggle';

import { AuthStore } from '../../../application/auth.store';
import { SubscriptionStore } from '../../../../billing/application/subscription.store';
import { PlanInterval } from '../../../../billing/domain/model/plan.entity';

type AccountRole = 'ROLE_GROWER' | 'ROLE_SPECIALIST';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe, AuthLanguageToggle],
  templateUrl: './register-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class RegisterPage implements OnDestroy {
  protected readonly auth = inject(AuthStore);
  protected readonly subscription = inject(SubscriptionStore);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Artistic backdrop carousel (shared visual language with the login screen).
  protected readonly activeSlide = signal(0);
  /** The motivational caption typed at the foot of the crisp window. */
  protected readonly typedTitle = signal('');
  protected readonly carouselSlides = [
    { src: '/assets/images/onboarding/carrusel_1.png' },
    { src: '/assets/images/onboarding/carrusel_2.png' },
    { src: '/assets/images/onboarding/carrusel_3.png' },
  ];
  private readonly slideHoldMs = 6500;
  private readonly typeSpeedMs = 55;
  private readonly deleteSpeedMs = 28;
  private cycleTimer: ReturnType<typeof setTimeout> | undefined;
  private typeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Role-oriented value props shown in the left context panel. */
  private readonly roleBenefitKeys: Record<AccountRole, string[]> = {
    ROLE_GROWER: [
      'auth.register.benefits.producerB1',
      'auth.register.benefits.producerB2',
      'auth.register.benefits.producerB3',
    ],
    ROLE_SPECIALIST: [
      'auth.register.benefits.specialistB1',
      'auth.register.benefits.specialistB2',
      'auth.register.benefits.specialistB3',
    ],
  };

  /** Motivational captions, one per slide, tailored to the chosen segment. */
  private readonly rolePhraseKeys: Record<AccountRole, string[]> = {
    ROLE_GROWER: [
      'auth.register.motiv.producerP1',
      'auth.register.motiv.producerP2',
      'auth.register.motiv.producerP3',
    ],
    ROLE_SPECIALIST: [
      'auth.register.motiv.specialistP1',
      'auth.register.motiv.specialistP2',
      'auth.register.motiv.specialistP3',
    ],
  };

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
      // Only animate once we know we're staying on this screen. Wait for the
      // translation bundle so the first caption is never its raw i18n key.
      this.translate.get(this.rolePhraseKeys[this.role()][0]).subscribe(() => {
        this.typeIn(this.phraseAt(0), () => this.scheduleNextSlide());
      });
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

  // ----- Backdrop carousel + typewriter caption -----

  protected selectSlide(index: number): void {
    if (index === this.activeSlide()) {
      return;
    }
    this.clearTimers();
    this.transitionTo(index);
  }

  /** Resolves the caption for a slide to the current segment's phrase. */
  private phraseAt(index: number): string {
    return this.translate.instant(this.rolePhraseKeys[this.role()][index]);
  }

  private scheduleNextSlide(): void {
    this.cycleTimer = setTimeout(() => {
      const next = (this.activeSlide() + 1) % this.carouselSlides.length;
      this.transitionTo(next);
    }, this.slideHoldMs);
  }

  /** Deletes the current caption, swaps the slide, then types the new caption. */
  private transitionTo(index: number): void {
    this.deleteAll(() => {
      this.activeSlide.set(index);
      this.typeIn(this.phraseAt(index), () => this.scheduleNextSlide());
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

  protected get isSpecialist(): boolean {
    return this.role() === 'ROLE_SPECIALIST';
  }

  // ----- Left context panel (the role + plan carried from /plans) -----

  protected get roleNameKey(): string {
    return this.isSpecialist ? 'auth.roles.specialist' : 'auth.roles.producer';
  }

  protected get roleDescriptionKey(): string {
    return this.isSpecialist
      ? 'auth.register.specialistDescription'
      : 'auth.register.producerDescription';
  }

  protected get roleImage(): string {
    return this.isSpecialist
      ? '/assets/images/general/phytosanitary-specialist-character-2.png'
      : '/assets/images/general/olive-producer-character-2.png';
  }

  protected get roleBenefits(): string[] {
    return this.roleBenefitKeys[this.role()];
  }

  /** A specialist's phone is their producer-facing contact, so it's mandatory. */
  protected get phoneRequired(): boolean {
    return this.isSpecialist;
  }

  protected get passwordsMismatch(): boolean {
    return this.confirmPassword().length > 0 && this.password() !== this.confirmPassword();
  }

  /** Conventional password policy, evaluated live for the requirements hint. */
  protected readonly passwordRules = computed(() => {
    const value = this.password();
    return {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  });

  /** The requirements list rendered under the password field. */
  protected readonly passwordChecklist = computed(() => {
    const rules = this.passwordRules();
    return [
      { met: rules.length, labelKey: 'auth.fields.pwdRules.length' },
      { met: rules.upper, labelKey: 'auth.fields.pwdRules.upper' },
      { met: rules.lower, labelKey: 'auth.fields.pwdRules.lower' },
      { met: rules.number, labelKey: 'auth.fields.pwdRules.number' },
      { met: rules.special, labelKey: 'auth.fields.pwdRules.special' },
    ];
  });

  protected readonly passwordValid = computed<boolean>(() =>
    Object.values(this.passwordRules()).every(Boolean),
  );

  protected get canSubmit(): boolean {
    return (
      this.fullName().trim().length > 1 &&
      this.email().trim().length > 3 &&
      this.passwordValid() &&
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
