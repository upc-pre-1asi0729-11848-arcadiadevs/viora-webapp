import { Routes } from '@angular/router';

const comingSoonPage = () =>
  import('../../shared/presentation/views/coming-soon-page/coming-soon-page').then(
    (m) => m.ComingSoonPage,
  );
const iotDeviceList = () =>
  import('./views/iot-device-list/iot-device-list').then((m) => m.IotDeviceList);
const iotDeviceForm = () =>
  import('./views/iot-device-form/iot-device-form').then((m) => m.IotDeviceForm);
const myPlotsOverview = () =>
  import('./views/my-plots-overview/my-plots-overview').then((m) => m.MyPlotsOverviewView);
const plotCreate = () => import('./views/plot-create/plot-create').then((m) => m.PlotCreate);
const plotDetail = () => import('./views/plot-detail/plot-detail').then((m) => m.PlotDetailView);
const dynamicNutritionPage = () =>
  import('./views/dynamic-nutrition/dynamic-nutrition-page').then((m) => m.DynamicNutritionPage);

/**
 * Route tree for agronomic bounded-context views.
 */
export const agronomicRoutes: Routes = [
  {
    path: '',
    redirectTo: 'iot-devices',
    pathMatch: 'full',
  },
  {
    path: 'plots',
    title: 'My Plots',
    loadComponent: myPlotsOverview,
    data: {
      pageTitle: 'My Plots',
      sectionLabel: 'My Plots',
      subtitle: 'Manage your registered production plots and field boundaries.',
    },
  },
  {
    path: 'plots/new',
    title: 'My Plots / Create plot',
    loadComponent: plotCreate,
    data: {
      pageTitle: 'My Plots / Create plot',
      sectionLabel: 'My Plots',
      subtitle: 'Register a new production plot and draw its field boundary.',
    },
  },
  {
    path: 'plots/import',
    title: 'My Plots / Import coordinates',
    loadComponent: comingSoonPage,
    data: {
      pageTitle: 'My Plots / Import coordinates',
      sectionLabel: 'My Plots',
      subtitle: 'Import plot boundaries from coordinate files.',
    },
  },
  {
    path: 'plots/:id/edit',
    title: 'My Plots / Edit plot',
    loadComponent: plotCreate,
    data: {
      pageTitle: 'My Plots / Edit plot',
      sectionLabel: 'My Plots',
      subtitle: 'Update plot information and boundary.',
    },
  },
  {
    path: 'plots/:id',
    title: 'My Plots / Plot detail',
    loadComponent: plotDetail,
    data: {
      pageTitle: 'My Plots / Plot detail',
      sectionLabel: 'My Plots',
      subtitle: 'Review plot boundaries, monitoring status, and linked devices.',
    },
  },
  {
    path: 'dynamic-nutrition',
    title: 'Dynamic Nutrition',
    loadComponent: dynamicNutritionPage,
    data: {
      pageTitle: 'Dynamic Nutrition',
      sectionLabel: 'Dynamic Nutrition',
      subtitle: 'Plan nutrition adjustments with dynamic crop indicators.',
    },
  },
  {
    path: 'dynamic-nutrition/plan',
    title: 'Nutrition Plan',
    loadComponent: dynamicNutritionPage,
    data: {
      pageTitle: 'Nutrition Plan',
      sectionLabel: 'Dynamic Nutrition',
      subtitle: 'Plan nutrition adjustments with dynamic crop indicators.',
    },
  },
  {
    path: 'iot-devices',
    title: 'IoT Devices',
    loadComponent: iotDeviceList,
    data: {
      title: 'IoT Devices',
      subtitle: 'Manage connected field devices and telemetry readings.',
    },
  },
  {
    path: 'iot-devices/new',
    title: 'IoT Devices / New device',
    loadComponent: iotDeviceForm,
    data: {
      title: 'IoT Devices / New device',
      subtitle: 'Register an external IoT device connected to a monitored plot.',
    },
  },
  {
    path: 'iot-devices/:id/edit',
    title: 'IoT Devices / Edit device',
    loadComponent: iotDeviceForm,
    data: {
      title: 'IoT Devices / Edit device',
      subtitle: 'Update device telemetry configuration and monitoring status.',
    },
  },
];
