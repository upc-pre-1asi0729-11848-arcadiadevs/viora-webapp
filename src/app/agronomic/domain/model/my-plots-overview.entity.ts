/**
 * @file my-plots-overview.entity.ts
 * @description Domain entity for the aggregated My Plots overview, used on the
 * dashboard to source real IoT device and plot-health counts.
 */
import { PhenologicalRiskLevel, PlotCoordinate, PlotHealthStatus } from './plot.entity';

export interface MyPlotOverviewItemProperties {
  id?: number | string | null;
  name?: string;
  location?: string;
  areaSizeHectares?: number;
  polygonCoordinates?: PlotCoordinate[];
  healthStatus?: PlotHealthStatus;
  phenologicalRisk?: PhenologicalRiskLevel;
  currentNdvi?: number;
  chillPortions?: number;
  onlineDeviceCount?: number;
  activeAlertCount?: number;
  lastUpdatedAt?: string;
}

export class MyPlotOverviewItem {
  readonly id: number | string | null;
  readonly name: string;
  readonly location: string;
  readonly areaSizeHectares: number;
  readonly polygonCoordinates: PlotCoordinate[];
  readonly healthStatus: PlotHealthStatus;
  readonly phenologicalRisk: PhenologicalRiskLevel;
  readonly currentNdvi: number;
  readonly chillPortions: number;
  readonly onlineDeviceCount: number;
  readonly activeAlertCount: number;
  readonly lastUpdatedAt: string;

  constructor({
    id = null,
    name = '',
    location = '',
    areaSizeHectares = 0,
    polygonCoordinates = [],
    healthStatus = 'Healthy',
    phenologicalRisk = 'Low',
    currentNdvi = 0,
    chillPortions = 0,
    onlineDeviceCount = 0,
    activeAlertCount = 0,
    lastUpdatedAt = '',
  }: MyPlotOverviewItemProperties = {}) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.areaSizeHectares = areaSizeHectares;
    this.polygonCoordinates = polygonCoordinates;
    this.healthStatus = healthStatus;
    this.phenologicalRisk = phenologicalRisk;
    this.currentNdvi = currentNdvi;
    this.chillPortions = chillPortions;
    this.onlineDeviceCount = onlineDeviceCount;
    this.activeAlertCount = activeAlertCount;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  get hasIot(): boolean {
    return this.onlineDeviceCount > 0;
  }

  get hasAlerts(): boolean {
    return this.activeAlertCount > 0;
  }

  /** "Tacna · 4.2 ha" style line shown under the plot name. */
  get metaLabel(): string {
    const area = `${this.areaSizeHectares.toFixed(1)} ha`;

    return this.location ? `${this.location} · ${area}` : area;
  }

  /** NDVI rounded to two decimals for the indicator pill. */
  get ndviLabel(): string {
    return this.currentNdvi.toFixed(2);
  }

  /** Chill accumulation in chill portions, e.g. "72 CP". */
  get chillLabel(): string {
    return `${Math.round(this.chillPortions)} CP`;
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
