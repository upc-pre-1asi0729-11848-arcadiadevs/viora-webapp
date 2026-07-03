import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ActiveSessionService } from '../../shared/infrastructure/active-session.service';

/** Blocks app screens for signed-out visitors, sending them to /login. */
export const authGuard: CanActivateFn = () => {
  const session = inject(ActiveSessionService);
  const router = inject(Router);
  return session.isAuthenticated() ? true : router.parseUrl('/login');
};

/** Keeps signed-in users out of the login/register screens. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(ActiveSessionService);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    return true;
  }
  return router.parseUrl(session.isSpecialist() ? '/specialist' : '/dashboard');
};
