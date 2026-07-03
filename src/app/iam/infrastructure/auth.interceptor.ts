import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { ActiveSessionService } from '../../shared/infrastructure/active-session.service';

/**
 * Attaches the session's bearer token to every request against the Viora
 * Platform API. Requests to third parties (Mapbox, tiles, i18n assets) are
 * left untouched.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(ActiveSessionService);
  const token = session.token;

  if (token && req.url.startsWith(environment.vioraPlatformApiUrl)) {
    return next(
      req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
    );
  }
  return next(req);
};
