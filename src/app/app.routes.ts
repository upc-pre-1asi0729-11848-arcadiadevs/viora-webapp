import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './iam/presentation/auth.guards';

const workspaceRoutes = () =>
  import('./shared/presentation/workspace.routes').then((m) => m.workspaceRoutes);
const agronomicRoutes = () =>
  import('./agronomic/presentation/agronomic.routes').then((m) => m.agronomicRoutes);
const surveillanceRoutes = () =>
  import('./surveillance/presentation/surveillance.routes').then((m) => m.surveillanceRoutes);
const interventionRoutes = () =>
  import('./intervention/presentation/intervention.routes').then((m) => m.interventionRoutes);
const profileRoutes = () =>
  import('./profile/presentation/profile.routes').then((m) => m.profileRoutes);
const billingRoutes = () =>
  import('./billing/presentation/billing.routes').then((m) => m.billingRoutes);
const supportRoutes = () =>
  import('./shared/presentation/support.routes').then((m) => m.supportRoutes);
const layout = () => import('./shared/presentation/components/layout/layout').then((m) => m.Layout);
const loginPage = () =>
  import('./iam/presentation/views/login-page/login-page').then((m) => m.LoginPage);
const registerPage = () =>
  import('./iam/presentation/views/register-page/register-page').then((m) => m.RegisterPage);
const verifyPage = () =>
  import('./iam/presentation/views/verify-page/verify-page').then((m) => m.VerifyPage);

/**
 * Root route configuration. The `layout` (sidebar + content shell) is mounted
 * ONCE as a shared parent so it is never destroyed when navigating between
 * sections — this preserves the sidebar's scroll position (e.g. jumping from
 * Support to Subscription no longer scrolls the sidebar back to the top).
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  // Authentication screens (outside the layout shell).
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: loginPage,
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: registerPage,
  },
  {
    path: 'verify',
    title: 'Verify email',
    loadComponent: verifyPage,
  },

  // Canonical path aliases (evaluated before the layout parent).
  {
    path: 'plots',
    redirectTo: 'agronomic/plots',
    pathMatch: 'full',
  },
  {
    path: 'plots/details',
    redirectTo: 'agronomic/plots',
    pathMatch: 'full',
  },
  {
    path: 'alerts',
    redirectTo: 'surveillance/alerts',
    pathMatch: 'full',
  },
  {
    path: 'producer/iot-devices',
    redirectTo: 'agronomic/iot-devices',
    pathMatch: 'full',
  },
  {
    path: 'producer/iot-devices/new',
    redirectTo: 'agronomic/iot-devices/new',
    pathMatch: 'full',
  },
  {
    path: 'producer/iot-devices/:id/edit',
    redirectTo: 'agronomic/iot-devices/:id/edit',
    pathMatch: 'full',
  },
  {
    path: 'dynamic-nutrition',
    redirectTo: 'agronomic/dynamic-nutrition',
    pathMatch: 'full',
  },
  {
    path: 'dynamic-nutrition/plan',
    redirectTo: 'agronomic/dynamic-nutrition/plan',
    pathMatch: 'full',
  },
  {
    path: 'pest-surveillance',
    redirectTo: 'surveillance/pest-surveillance',
    pathMatch: 'full',
  },
  {
    path: 'pest-surveillance/report-symptoms',
    redirectTo: 'surveillance/pest-surveillance/report-symptoms',
    pathMatch: 'full',
  },
  {
    path: 'expert-assistance',
    redirectTo: 'assistance/expert-assistance',
    pathMatch: 'full',
  },
  {
    path: 'interventions',
    redirectTo: 'assistance/interventions',
    pathMatch: 'full',
  },
  {
    path: 'expert-assistance/request',
    redirectTo: 'assistance/expert-assistance/request',
    pathMatch: 'full',
  },
  {
    path: 'expense-history',
    redirectTo: 'agronomic/expense-history',
    pathMatch: 'full',
  },
  {
    path: 'subscription',
    redirectTo: 'billing/subscription',
    pathMatch: 'full',
  },

  // Single, persistent layout shell hosting every section (sign-in required).
  {
    path: '',
    loadComponent: layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'agronomic',
        loadChildren: agronomicRoutes,
      },
      {
        path: 'surveillance',
        loadChildren: surveillanceRoutes,
      },
      {
        path: 'assistance',
        loadChildren: interventionRoutes,
      },
      {
        path: 'settings',
        loadChildren: profileRoutes,
      },
      {
        path: 'billing',
        loadChildren: billingRoutes,
      },
      {
        path: 'support',
        loadChildren: supportRoutes,
      },
      {
        path: '',
        loadChildren: workspaceRoutes,
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
