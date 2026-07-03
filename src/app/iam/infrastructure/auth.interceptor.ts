import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ActiveSessionService } from '../../shared/infrastructure/active-session.service';

/**
 * Attaches the session's bearer token to every request against the Viora
 * Platform API. Requests to third parties (Mapbox, tiles, i18n assets) are
 * left untouched. When a token-bearing Platform call is rejected with 401 (the
 * token is missing/expired/invalid now that the backend enforces auth), the
 * session is ended and the user is sent to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(ActiveSessionService);
  const router = inject(Router);
  const token = session.token;

  const isPlatformCall = req.url.startsWith(environment.vioraPlatformApiUrl);
  const outgoing =
    token && isPlatformCall
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isPlatformCall &&
        token
      ) {
        // Our bearer was rejected → the session is no longer valid.
        session.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
