import { Component, Input, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';

/**
 * A discreet globe toggle between English and Spanish, for the pre-login screens
 * (login / register / plans) that have no sidebar language switcher. Persists the
 * choice to the same `viora-language` key the in-app switcher uses.
 *
 * `theme` tints it for a dark backdrop (login/register) or a light one (plans).
 */
@Component({
  selector: 'app-auth-language-toggle',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <button
      type="button"
      class="lang-toggle"
      [class.on-light]="theme === 'light'"
      (click)="toggle()"
      [attr.aria-label]="'Switch language (current: ' + current().toUpperCase() + ')'"
      [title]="current() === 'en' ? 'Cambiar a Español' : 'Switch to English'">
      <mat-icon aria-hidden="true">language</mat-icon>
      <span>{{ current().toUpperCase() }}</span>
    </button>
  `,
  styles: [
    `
      .lang-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 34px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: #fff;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: background 0.18s ease, border-color 0.18s ease;
      }
      .lang-toggle:hover {
        background: rgba(255, 255, 255, 0.24);
        border-color: rgba(255, 255, 255, 0.45);
      }
      .lang-toggle mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
      .lang-toggle.on-light {
        border-color: rgba(46, 74, 58, 0.22);
        background: rgba(46, 74, 58, 0.06);
        color: #2e4a3a;
      }
      .lang-toggle.on-light:hover {
        background: rgba(46, 74, 58, 0.12);
        border-color: rgba(46, 74, 58, 0.4);
      }
    `,
  ],
})
export class AuthLanguageToggle {
  /** Tints the control for a dark backdrop (default) or a light one. */
  @Input() theme: 'dark' | 'light' = 'dark';

  private readonly translate = inject(TranslateService);
  protected readonly current = signal<'en' | 'es'>('en');

  constructor() {
    const active = this.translate.currentLang || 'en';
    this.current.set(active === 'es' ? 'es' : 'en');
  }

  protected toggle(): void {
    const next = this.current() === 'en' ? 'es' : 'en';
    this.current.set(next);
    this.translate.use(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('viora-language', next);
    }
  }
}
