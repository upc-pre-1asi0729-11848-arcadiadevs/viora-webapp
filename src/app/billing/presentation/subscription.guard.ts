import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { SubscriptionAccessService } from '../application/subscription-access.service';

/**
 * Payment-first gate: keeps the workspace behind an active subscription. Runs
 * after the auth guard (so the user is known to be signed in). A user without an
 * active plan is sent to the public plan-selection screen. A successful
 * MercadoPago return (`status`/`collection_status` = approved) is trusted
 * optimistically, since the activating webhook may land a moment later.
 */
export const subscriptionGuard: CanActivateFn = (_route, state) => {
  const access = inject(SubscriptionAccessService);
  const router = inject(Router);

  if (/(?:status|collection_status)=approved/.test(state.url)) {
    access.markActive();
    return true;
  }

  return access.check().pipe(
    map((hasAccess) => (hasAccess ? true : router.parseUrl('/plans'))),
  );
};
