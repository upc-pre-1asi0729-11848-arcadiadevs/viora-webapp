import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';
import { AuthLanguageToggle } from '../../../../shared/presentation/components/auth-language-toggle/auth-language-toggle';

/** A background/story slide: its image, CTA headline, and the segment it evokes. */
interface LoginSlide {
  src: string;
  titleKey: string;
  segment: 'producer' | 'specialist';
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe, AuthLanguageToggle],
  templateUrl: './login-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class LoginPage implements OnDestroy {
  protected readonly auth = inject(AuthStore);
  private readonly translate = inject(TranslateService);

  /** The marketing site the "Back" link returns to. */
  protected readonly landingUrl = 'https://viora-website.vercel.app/';

  // Timings: each slide holds ~9s; the headline deletes then retypes on change.
  private readonly slideHoldMs = 9000;
  private readonly typeSpeedMs = 55;
  private readonly deleteSpeedMs = 28;
  private cycleTimer: ReturnType<typeof setTimeout> | undefined;
  private typeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly activeSlide = signal(0);
  /** The headline text currently revealed by the typewriter effect. */
  protected readonly typedTitle = signal('');

  // login-1 evokes the specialist segment; login-2 / login-3 the producer one.
  // The CTA headline changes with each slide to match the backdrop.
  protected readonly carouselSlides: LoginSlide[] = [
    { src: '/assets/images/onboarding/login-1.png', titleKey: 'auth.login.slides.specialist', segment: 'specialist' },
    { src: '/assets/images/onboarding/login-2.png', titleKey: 'auth.login.slides.producerThrive', segment: 'producer' },
    { src: '/assets/images/onboarding/login-3.png', titleKey: 'auth.login.slides.producerGrow', segment: 'producer' },
  ];

  constructor() {
    this.auth.clearMessages();
    // The login is a fixed-height, full-viewport layout with a pinned backdrop,
    // so lock page scroll while it's shown (restored when leaving).
    document.body.style.overflow = 'hidden';
    // Wait for the translation bundle before typing so the first headline is never
    // its raw i18n key (translations load async over HTTP on first paint), then
    // type it in and start the auto-cycle.
    this.translate.get(this.carouselSlides[0].titleKey).subscribe((text) => {
      this.typeIn(text, () => this.scheduleNextSlide());
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
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

  /** Jumps to a slide (dot click): delete the current headline, then transition. */
  protected selectSlide(index: number): void {
    if (index === this.activeSlide()) {
      return;
    }
    this.clearTimers();
    this.transitionTo(index);
  }

  /** Resolves a slide's headline to its translated string. */
  private titleTextAt(index: number): string {
    return this.translate.instant(this.carouselSlides[index].titleKey);
  }

  private scheduleNextSlide(): void {
    this.cycleTimer = setTimeout(() => {
      const next = (this.activeSlide() + 1) % this.carouselSlides.length;
      this.transitionTo(next);
    }, this.slideHoldMs);
  }

  /** Deletes the current headline, swaps the slide, then types the new headline. */
  private transitionTo(index: number): void {
    this.deleteAll(() => {
      this.activeSlide.set(index);
      this.typeIn(this.titleTextAt(index), () => this.scheduleNextSlide());
    });
  }

  /** Removes the revealed text one character at a time, then runs `done`. */
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

  /** Reveals `target` one character at a time from empty, then runs `done`. */
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
}
