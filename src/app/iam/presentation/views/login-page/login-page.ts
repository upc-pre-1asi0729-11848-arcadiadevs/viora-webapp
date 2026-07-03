import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class LoginPage {
  protected readonly auth = inject(AuthStore);

  protected readonly email = signal('');
  protected readonly password = signal('');

  constructor() {
    this.auth.clearMessages();
  }

  protected get canSubmit(): boolean {
    return this.email().trim().length > 3 && this.password().length >= 8 && !this.auth.busy();
  }

  protected submit(): void {
    if (this.canSubmit) {
      this.auth.signIn(this.email(), this.password());
    }
  }

  protected resend(): void {
    if (this.email().trim()) {
      this.auth.resendVerification(this.email());
    }
  }
}
