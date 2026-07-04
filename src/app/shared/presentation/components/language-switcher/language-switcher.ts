import { Component } from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [MatSelectModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.css'
})
export class LanguageSwitcher {
  protected readonly languageOptions = [
    {
      value: 'en',
      label: 'English'
    },
    {
      value: 'es',
      label: 'Español'
    }
  ];

  protected currentLanguage = 'en';

  constructor(private readonly translateService: TranslateService) {
    const savedLanguage = this.getSavedLanguage();
    this.currentLanguage = savedLanguage;
    this.translateService.use(savedLanguage);
  }

  protected onLanguageSelected(event: MatSelectChange): void {
    const language = String(event.value);

    if (language !== 'en' && language !== 'es') {
      return;
    }

    this.currentLanguage = language;
    this.translateService.use(language);
    this.saveLanguage(language);
  }

  private getSavedLanguage(): string {
    if (typeof localStorage === 'undefined') {
      return this.translateService.currentLang || 'en';
    }

    const savedLanguage = localStorage.getItem('viora-language');

    return savedLanguage === 'es' || savedLanguage === 'en'
      ? savedLanguage
      : 'en';
  }

  private saveLanguage(language: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('viora-language', language);
    }
  }
}
