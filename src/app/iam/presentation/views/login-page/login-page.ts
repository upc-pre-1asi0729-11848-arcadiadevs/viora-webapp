import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';

/** A background/story slide: its image, CTA headline, and the segment it evokes. */
interface LoginSlide {
  src: string;
  titleKey: string;
  segment: 'producer' | 'specialist';
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './login-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class LoginPage implements OnDestroy {
  protected readonly auth = inject(AuthStore);

  /** The marketing site the "Back" link returns to. */
  protected readonly landingUrl = 'https://viora-website.vercel.app/';

  private readonly carouselDelayMs = 8000;
  private carouselTimer: ReturnType<typeof window.setInterval> | undefined;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly activeSlide = signal(0);

  // login-1 evokes the specialist segment; login-2 / login-3 the producer one.
  // The CTA headline changes with each slide to match the backdrop.
  protected readonly carouselSlides: LoginSlide[] = [
    { src: '/assets/images/onboarding/login-1.png', titleKey: 'auth.login.slides.specialist', segment: 'specialist' },
    { src: '/assets/images/onboarding/login-2.png', titleKey: 'auth.login.slides.producerThrive', segment: 'producer' },
    { src: '/assets/images/onboarding/login-3.png', titleKey: 'auth.login.slides.producerGrow', segment: 'producer' },
  ];

  /** The CTA headline key for the active slide. */
  protected readonly activeTitleKey = computed<string>(
    () => this.carouselSlides[this.activeSlide()].titleKey,
  );

  constructor() {
    this.auth.clearMessages();
    this.startCarousel();
    // The login is a fixed-height, full-viewport layout with a pinned backdrop,
    // so lock page scroll while it's shown (restored when leaving).
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    document.body.style.overflow = '';
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
