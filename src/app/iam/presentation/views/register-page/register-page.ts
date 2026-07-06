import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';

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
  private readonly route = inject(ActivatedRoute);

  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly role = signal<AccountRole>('ROLE_GROWER');
  protected readonly referralCode = signal('');

  /** Once registered, the page flips to the "check your email" state. */
  protected readonly submitted = signal(false);

  constructor() {
    this.auth.clearMessages();
    // Referral links look like /register?ref=VIORA-XXXXXX — prefill the code.
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref) {
      this.referralCode.set(ref.toUpperCase());
    }
  }

  protected selectRole(role: AccountRole): void {
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
    this.auth.signUp(
      {
        email: this.email(),
        password: this.password(),
        role: this.role(),
        fullName: this.fullName().trim(),
        phone: this.phone().trim() || null,
        referralCode: this.referralCode().trim() || null,
      },
      (ok) => {
        if (ok) {
          this.submitted.set(true);
        }
      },
    );
  }

  protected resend(): void {
    this.auth.resendVerification(this.email());
  }
}
