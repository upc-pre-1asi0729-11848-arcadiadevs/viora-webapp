import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('OS-Viora-Application');
  private readonly translate = inject(TranslateService);

  constructor() {
    // Apply the saved language app-wide at startup so every screen — including the
    // pre-login ones (login / register / plans) that have no sidebar switcher —
    // honours the user's choice instead of always defaulting to English.
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('viora-language');
      if (saved === 'es' || saved === 'en') {
        this.translate.use(saved);
      }
    }
  }
}
