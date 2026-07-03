import { Routes } from '@angular/router';

const supportOverview = () =>
  import('./views/support-overview/support-overview').then((m) => m.SupportOverviewView);

/**
 * Route tree for the Support views (FAQ + legal documents), mounted at /support.
 */
export const supportRoutes: Routes = [
  {
    path: '',
    title: 'Support',
    loadComponent: supportOverview,
  },
];
