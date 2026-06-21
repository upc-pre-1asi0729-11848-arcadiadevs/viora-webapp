import { Routes } from '@angular/router';

const alertsOverview = () => import('./views/alerts-overview/alerts-overview').then(m => m.AlertsOverviewView);
const pestSurveillanceOverview = () => import('./views/pest-surveillance-overview/pest-surveillance-overview').then(m => m.PestSurveillanceOverviewView);

/**
 * Route tree for surveillance bounded-context views.
 */
export const surveillanceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'alerts',
    pathMatch: 'full'
  },
  {
    path: 'alerts',
    title: 'Alerts',
    loadComponent: alertsOverview
  },
  {
    path: 'pest-surveillance',
    title: 'Pest Surveillance',
    loadComponent: pestSurveillanceOverview
  },
  {
    path: 'pest-surveillance/report-symptoms',
    redirectTo: 'pest-surveillance',
    pathMatch: 'full'
  }
];
