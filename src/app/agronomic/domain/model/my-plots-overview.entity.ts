/**
 * @file my-plots-overview.entity.ts
 * @description Domain entity for the aggregated My Plots overview, used on the
 * dashboard to source real IoT device and plot-health counts.
 */
import { PlotHealthStatus } from './plot.entity';

export interface MyPlotOverviewItemProperties {
  id?: number | string | null;
  name?: string;
  healthStatus?: PlotHealthStatus;
  currentNdvi?: number;
  chillPortions?: number;
  onlineDeviceCount?: number;
  activeAlertCount?: number;
  lastUpdatedAt?: string;
}

export class MyPlotOverviewItem {
  readonly id: number | string | null;
  readonly name: string;
  readonly healthStatus: PlotHealthStatus;
  readonly currentNdvi: number;
  readonly chillPortions: number;
  readonly onlineDeviceCount: number;
  readonly activeAlertCount: number;
  readonly lastUpdatedAt: string;

  constructor({
    id = null,
    name = '',
    healthStatus = 'Healthy',
    currentNdvi = 0,
    chillPortions = 0,
    onlineDeviceCount = 0,
    activeAlertCount = 0,
    lastUpdatedAt = '',
  }: MyPlotOverviewItemProperties = {}) {
    this.id = id;
    this.name = name;
    this.healthStatus = healthStatus;
    this.currentNdvi = currentNdvi;
    this.chillPortions = chillPortions;
    this.onlineDeviceCount = onlineDeviceCount;
    this.activeAlertCount = activeAlertCount;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  get hasIot(): boolean {
    return this.onlineDeviceCount > 0;
  }
}

export interface MyPlotsOverviewProperties {
  registeredPlotCount?: number;
  monitoredAreaHectares?: number;
  climateLinkedPlotCount?: number;
  onlineDeviceCount?: number;
  plots?: MyPlotOverviewItem[];
}

export class MyPlotsOverview {
  readonly registeredPlotCount: number;
  readonly monitoredAreaHectares: number;
  readonly climateLinkedPlotCount: number;
  readonly onlineDeviceCount: number;
  readonly plots: MyPlotOverviewItem[];

  constructor({
    registeredPlotCount = 0,
    monitoredAreaHectares = 0,
    climateLinkedPlotCount = 0,
    onlineDeviceCount = 0,
    plots = [],
  }: MyPlotsOverviewProperties = {}) {
    this.registeredPlotCount = registeredPlotCount;
    this.monitoredAreaHectares = monitoredAreaHectares;
    this.climateLinkedPlotCount = climateLinkedPlotCount;
    this.onlineDeviceCount = onlineDeviceCount;
    this.plots = plots;
  }

  /** Number of plots that have at least one device online. */
  get plotsWithIotCount(): number {
    return this.plots.filter((plot) => plot.hasIot).length;
  }

  /** Online device count for a given plot, or aggregate when scope is `all`. */
  onlineDeviceCountForScope(scope: number | string): number {
    if (scope === 'all') {
      return this.onlineDeviceCount;
    }

    return this.plots
      .filter((plot) => String(plot.id) === String(scope))
      .reduce((total, plot) => total + plot.onlineDeviceCount, 0);
  }

  /** Most recent plot update timestamp across the overview, if any. */
  get lastUpdatedAt(): string {
    return this.plots
      .map((plot) => plot.lastUpdatedAt)
      .filter((value) => Boolean(value))
      .sort((first, second) => Date.parse(second) - Date.parse(first))
      .at(0) ?? '';
  }
}
