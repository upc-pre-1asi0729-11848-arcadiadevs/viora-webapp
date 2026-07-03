import { Routes } from '@angular/router';

const settingsOverview = () =>
  import('./views/settings-overview/settings-overview').then((m) => m.SettingsOverviewView);

/**
 * Route tree for the `Profile` bounded-context views (Profile & Asset
 * Management). Hosts the Settings screens (Profile, Referrals, Security), which
 * are rendered as tabs within a single overview view.
 */
export const profileRoutes: Routes = [
  {
    path: '',
    title: 'Settings',
    loadComponent: settingsOverview,
  },
];
