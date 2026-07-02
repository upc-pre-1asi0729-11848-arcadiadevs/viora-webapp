import { Routes } from '@angular/router';

const producerDashboard = () =>
  import('./views/producer-dashboard/producer-dashboard').then((m) => m.ProducerDashboard);
const plotOverviewPage = () =>
  import('./views/plot-overview-page/plot-overview-page').then((m) => m.PlotOverviewPage);
const weatherPage = () =>
  import('./views/weather-page/weather-page').then((m) => m.WeatherPage);
const comingSoonPage = () =>
  import('./views/coming-soon-page/coming-soon-page').then((m) => m.ComingSoonPage);

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
    path: 'billing/subscription',
    title: 'Subscription',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Subscription',
      sectionLabel: 'Subscription',
      subtitle: 'Manage plan details and billing configuration.',
    },
  },
  {
    path: 'support',
    title: 'Support',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Support',
      sectionLabel: 'Support',
      subtitle: 'Access help resources for the producer dashboard.',
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
];

/**
 * Route tree for workspace views that are not owned by a feature bounded context.
 */
export const workspaceRoutes: Routes = [
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
