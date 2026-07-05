import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { ActiveSessionService } from '../infrastructure/active-session.service';

/**
 * Route matcher for the specialist segment. Both `/dashboard` routes share the
 * same path; this lets the specialist dashboard win for specialist accounts
 * while the producer dashboard remains the fallback — keeping each dashboard in
 * its own lazily-loaded chunk instead of eagerly importing both.
 */
export const specialistDashboardMatch: CanMatchFn = () =>
  inject(ActiveSessionService).isSpecialist();
