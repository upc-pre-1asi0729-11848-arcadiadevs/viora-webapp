import { Routes } from '@angular/router';

const producerDashboard = () => import('./views/producer-dashboard/producer-dashboard').then(m => m.ProducerDashboard);
const comingSoonPage = () => import('./views/coming-soon-page/coming-soon-page').then(m => m.ComingSoonPage);
const agronomicRoutes = () => import('../../agronomic/presentation/agronomic.routes').then(m => m.agronomicRoutes);

const producerPlaceholderRoutes: Routes = [
  {
    path: 'plot',
    title: 'My Plots',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'My Plots',
      sectionLabel: 'My Plots',
      subtitle: 'Manage your registered production plots and field boundaries.'
    }
  },
  {
    path: 'alerts',
    title: 'Alerts',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Alerts',
      sectionLabel: 'Alerts',
      subtitle: 'Review field notifications and agronomic risk alerts.'
    }
  },
  {
    path: 'dynamic-nutrition',
    title: 'Dynamic Nutrition',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Dynamic Nutrition',
      sectionLabel: 'Dynamic Nutrition',
      subtitle: 'Plan nutrition adjustments with dynamic crop indicators.'
    }
  },
  {
    path: 'pest-surveillance',
    title: 'Pest Surveillance',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Pest Surveillance',
      sectionLabel: 'Pest Surveillance',
      subtitle: 'Track pest pressure and surveillance recommendations.'
    }
  },
  {
    path: 'expert-assistance',
    title: 'Expert Assistance',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Expert Assistance',
      sectionLabel: 'Expert Assistance',
      subtitle: 'Connect with specialists for producer support.'
    }
  },
  {
    path: 'expense-history',
    title: 'Expense History',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Expense History',
      sectionLabel: 'Expense History',
      subtitle: 'Review agricultural expenses and production cost history.'
    }
  },
  {
    path: 'settings',
    title: 'Settings',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Settings',
      sectionLabel: 'Settings',
      subtitle: 'Configure your dashboard and producer workspace preferences.'
    }
  },
  {
    path: 'subscription',
    title: 'Subscription',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Subscription',
      sectionLabel: 'Subscription',
      subtitle: 'Manage plan details and billing configuration.'
    }
  },
  {
    path: 'support',
    title: 'Support',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'Support',
      sectionLabel: 'Support',
      subtitle: 'Access help resources for the producer dashboard.'
    }
  }
];

/**
 * Route tree for producer dashboard views.
 */
export const producerRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    title: 'Overview',
    loadComponent: producerDashboard
  },
  ...producerPlaceholderRoutes,
  {
    path: '',
    loadChildren: agronomicRoutes
  }
];
