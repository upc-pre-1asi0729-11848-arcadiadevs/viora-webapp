import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

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
export class RegisterPage {
  protected readonly auth = inject(AuthStore);
  protected readonly subscription = inject(SubscriptionStore);
  private readonly route = inject(ActivatedRoute);

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
