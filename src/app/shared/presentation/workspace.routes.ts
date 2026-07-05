import { Routes } from '@angular/router';

import { specialistDashboardMatch } from './dashboard-role.guard';

const producerDashboard = () =>
  import('./views/producer-dashboard/producer-dashboard').then((m) => m.ProducerDashboard);
const specialistDashboard = () =>
  import('./views/specialist-dashboard/specialist-dashboard').then((m) => m.SpecialistDashboard);
const plotOverviewPage = () =>
  import('./views/plot-overview-page/plot-overview-page').then((m) => m.PlotOverviewPage);
const weatherPage = () =>
  import('./views/weather-page/weather-page').then((m) => m.WeatherPage);
const comingSoonPage = () =>
  import('./views/coming-soon-page/coming-soon-page').then((m) => m.ComingSoonPage);
const specialistMarketplace = () =>
  import('./views/specialist-marketplace/specialist-marketplace').then((m) => m.SpecialistMarketplace);

const workspacePlaceholderRoutes: Routes = [
  {
    path: 'assistance/expert-assistance',
    title: 'Expert Assistance',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Expert Assistance',
      sectionLabel: 'Expert Assistance',
      subtitle: 'Connect with specialists for producer support.',
    },
  },
  {
    path: 'assistance/expert-assistance/request',
    title: 'Request Expert',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Request Expert',
      sectionLabel: 'Expert Assistance',
      subtitle: 'Submit a request for specialist support.',
    },
  },
  {
    path: 'billing/expense-history',
    title: 'Expense History',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Expense History',
      sectionLabel: 'Expense History',
      subtitle: 'Review agricultural expenses and production cost history.',
    },
  },
  {
    path: 'profile',
    title: 'Profile',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Profile',
      sectionLabel: 'Profile',
      subtitle: 'Manage account details and preferences.',
    },
  },
  {
    path: 'specialist/marketplace',
    title: 'Intervention Marketplace',
    loadComponent: specialistMarketplace,
  },
  {
    path: 'specialist/requests',
    title: 'My Requests',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'My Requests',
      sectionLabel: 'My Requests',
      subtitle: 'Track the producer requests assigned to you and their status — coming soon.',
    },
  },
  {
    path: 'specialist/field-inspection',
    title: 'Field Inspection',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Field Inspection',
      sectionLabel: 'Field Inspection',
      subtitle: 'Log on-site inspection findings for your active interventions — coming soon.',
    },
  },
];

/**
 * Route tree for workspace views that are not owned by a feature bounded context.
 */
export const workspaceRoutes: Routes = [
  // Both dashboards share `/dashboard`; the specialist matcher wins for
  // specialist accounts, the producer dashboard is the fallback. Each stays in
  // its own lazy chunk.
  {
    path: 'dashboard',
    title: 'Overview',
    canMatch: [specialistDashboardMatch],
    loadComponent: specialistDashboard,
  },
  {
    path: 'dashboard',
    title: 'Overview',
    loadComponent: producerDashboard,
  },
  {
    path: 'dashboard/plot-overview/:plotId',
    title: 'Plot Overview',
    loadComponent: plotOverviewPage,
  },
  {
    path: 'dashboard/weather/:plotId',
    title: 'Weather',
    loadComponent: weatherPage,
  },
  ...workspacePlaceholderRoutes,
];
