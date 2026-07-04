import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './login-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class LoginPage implements OnDestroy {
  protected readonly auth = inject(AuthStore);

  private readonly carouselDelayMs = 5000;
  private carouselTimer: ReturnType<typeof window.setInterval> | undefined;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly activeSlide = signal(0);
  protected readonly carouselSlides = [
    {
      src: '/assets/images/onboarding/carrusel_1.png',
      label: 'Satellite monitoring landscape',
    },
    {
      src: '/assets/images/onboarding/carrusel_2.png',
      label: 'Field observation detail',
    },
    {
      src: '/assets/images/onboarding/carrusel_3.png',
      label: 'Farm intervention planning',
    },
  ];

  constructor() {
    this.auth.clearMessages();
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
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

  protected selectSlide(index: number): void {
    this.activeSlide.set(index);
    this.restartCarousel();
  }

  private advanceSlide(): void {
    this.activeSlide.update((index) => (index + 1) % this.carouselSlides.length);
  }

  private startCarousel(): void {
    this.carouselTimer = window.setInterval(() => this.advanceSlide(), this.carouselDelayMs);
  }

  private restartCarousel(): void {
    this.stopCarousel();
    this.startCarousel();
  }

  private stopCarousel(): void {
    if (this.carouselTimer !== undefined) {
      window.clearInterval(this.carouselTimer);
      this.carouselTimer = undefined;
    }
  }
}
