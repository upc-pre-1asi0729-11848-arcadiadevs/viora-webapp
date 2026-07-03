import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DashboardTitleStrategy } from './shared/infrastructure/dashboard-title.strategy';
import { authInterceptor } from './iam/infrastructure/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Reset scroll to the top on navigation so a new section (e.g. Subscription)
    // opens at its header instead of inheriting the previous page's scroll offset.
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    {
      provide: TitleStrategy,
      useClass: DashboardTitleStrategy,
    },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),

    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './i18n/',
        suffix: '.json',
      }),
    }),
    provideCharts(withDefaultRegisterables()),
  ],
};
