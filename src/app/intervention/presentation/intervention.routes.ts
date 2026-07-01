import { Routes } from '@angular/router';

const expertAssistanceOverview = () =>
  import('./views/expert-assistance-overview/expert-assistance-overview').then(
    (m) => m.ExpertAssistanceOverviewView,
  );

/**
 * Route tree for the intervention bounded-context views (Expert Assistance).
 */
export const interventionRoutes: Routes = [
  {
    path: '',
    redirectTo: 'expert-assistance',
    pathMatch: 'full',
  },
  {
    path: 'expert-assistance',
    title: 'Expert Assistance',
    loadComponent: expertAssistanceOverview,
  },
  {
    path: 'expert-assistance/request',
    redirectTo: 'expert-assistance',
    pathMatch: 'full',
  },
];
