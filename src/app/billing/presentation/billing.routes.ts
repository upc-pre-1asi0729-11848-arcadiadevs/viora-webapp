import { Routes } from '@angular/router';

const subscriptionOverview = () =>
  import('./views/subscription-overview/subscription-overview').then(
    (m) => m.SubscriptionOverviewView,
  );

/**
 * Route tree for the `Billing` bounded-context views (Subscription, Billing &
 * Referral). Hosts the Subscription overview screen.
 */
export const billingRoutes: Routes = [
  {
    path: '',
    redirectTo: 'subscription',
    pathMatch: 'full',
  },
  {
    path: 'subscription',
    title: 'Subscription',
    loadComponent: subscriptionOverview,
  },
];
