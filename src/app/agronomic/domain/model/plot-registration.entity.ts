/**
 * @file plot-registration.entity.ts
 * @description Domain entity for the result of registering a plot, used by the
 * Create Plot wizard's confirmation step.
 */
import { PlotCoordinate } from './plot.entity';

/** Display status of an automatic monitoring link after registration. */
export type MonitoringLinkStatus = 'active' | 'initializing' | 'not-linked' | 'unknown';

export interface PlotRegistrationProperties {
  id?: number | string | null;
  name?: string;
  location?: string;
  campaign?: string;
  cropType?: string;
  variety?: string;
  notes?: string;
  polygonCoordinates?: PlotCoordinate[];
  areaSizeHectares?: number;
  state?: string;
  climateMonitoring?: MonitoringLinkStatus;
  satelliteNdvi?: MonitoringLinkStatus;
  iotDevices?: MonitoringLinkStatus;
}

export class PlotRegistration {
  readonly id: number | string | null;
  readonly name: string;
  readonly location: string;
  readonly campaign: string;
  readonly cropType: string;
  readonly variety: string;
  readonly notes: string;
  readonly polygonCoordinates: PlotCoordinate[];
  readonly areaSizeHectares: number;
  readonly state: string;
  readonly climateMonitoring: MonitoringLinkStatus;
  readonly satelliteNdvi: MonitoringLinkStatus;
  readonly iotDevices: MonitoringLinkStatus;

  constructor({
    id = null,
    name = '',
    location = '',
    campaign = '',
    cropType = '',
    variety = '',
    notes = '',
    polygonCoordinates = [],
    areaSizeHectares = 0,
    state = '',
    climateMonitoring = 'unknown',
    satelliteNdvi = 'unknown',
    iotDevices = 'unknown',
  }: PlotRegistrationProperties = {}) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.campaign = campaign;
    this.cropType = cropType;
    this.variety = variety;
    this.notes = notes;
    this.polygonCoordinates = polygonCoordinates;
    this.areaSizeHectares = areaSizeHectares;
    this.state = state;
    this.climateMonitoring = climateMonitoring;
    this.satelliteNdvi = satelliteNdvi;
    this.iotDevices = iotDevices;
  }

  get areaLabel(): string {
    return `${this.areaSizeHectares.toFixed(1)} ha`;
  }
}
