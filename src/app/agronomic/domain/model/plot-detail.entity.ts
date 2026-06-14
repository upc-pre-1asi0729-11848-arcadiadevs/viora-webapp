/**
 * @file plot-detail.entity.ts
 * @description Domain entity for the My Plots / Plot Detail screen.
 */
import { PlotCoordinate } from './plot.entity';
import { MonitoringLinkStatus } from './plot-registration.entity';

export interface PlotLinkedDevice {
  id: number | string | null;
  name: string;
  status: string;
  lastActivityAt: string;
}

export interface PlotConfigurationActivity {
  type: string;
  description: string;
  occurredAt: string;
}

export interface PlotDetailProperties {
  id?: number | string | null;
  name?: string;
  location?: string;
  campaign?: string;
  cropType?: string;
  variety?: string;
  notes?: string;
  polygonCoordinates?: PlotCoordinate[];
  areaSizeHectares?: number;
  boundaryPointCount?: number;
  boundaryStatus?: string;
  registeredAt?: string;
  lastConfigurationUpdateAt?: string;
  climateMonitoring?: MonitoringLinkStatus;
  satelliteNdvi?: MonitoringLinkStatus;
  climateLastSyncAt?: string;
  satelliteLastSyncAt?: string;
  iotStatus?: MonitoringLinkStatus;
  linkedDeviceCount?: number;
  onlineDeviceCount?: number;
  iotLastActivityAt?: string;
  devices?: PlotLinkedDevice[];
  activity?: PlotConfigurationActivity[];
}

export class PlotDetail {
  readonly id: number | string | null;
  readonly name: string;
  readonly location: string;
  readonly campaign: string;
  readonly cropType: string;
  readonly variety: string;
  readonly notes: string;
  readonly polygonCoordinates: PlotCoordinate[];
  readonly areaSizeHectares: number;
  readonly boundaryPointCount: number;
  readonly boundaryStatus: string;
  readonly registeredAt: string;
  readonly lastConfigurationUpdateAt: string;
  readonly climateMonitoring: MonitoringLinkStatus;
  readonly satelliteNdvi: MonitoringLinkStatus;
  readonly climateLastSyncAt: string;
  readonly satelliteLastSyncAt: string;
  readonly iotStatus: MonitoringLinkStatus;
  readonly linkedDeviceCount: number;
  readonly onlineDeviceCount: number;
  readonly iotLastActivityAt: string;
  readonly devices: PlotLinkedDevice[];
  readonly activity: PlotConfigurationActivity[];

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
    boundaryPointCount = 0,
    boundaryStatus = '',
    registeredAt = '',
    lastConfigurationUpdateAt = '',
    climateMonitoring = 'unknown',
    satelliteNdvi = 'unknown',
    climateLastSyncAt = '',
    satelliteLastSyncAt = '',
    iotStatus = 'unknown',
    linkedDeviceCount = 0,
    onlineDeviceCount = 0,
    iotLastActivityAt = '',
    devices = [],
    activity = [],
  }: PlotDetailProperties = {}) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.campaign = campaign;
    this.cropType = cropType;
    this.variety = variety;
    this.notes = notes;
    this.polygonCoordinates = polygonCoordinates;
    this.areaSizeHectares = areaSizeHectares;
    this.boundaryPointCount = boundaryPointCount;
    this.boundaryStatus = boundaryStatus;
    this.registeredAt = registeredAt;
    this.lastConfigurationUpdateAt = lastConfigurationUpdateAt;
    this.climateMonitoring = climateMonitoring;
    this.satelliteNdvi = satelliteNdvi;
    this.climateLastSyncAt = climateLastSyncAt;
    this.satelliteLastSyncAt = satelliteLastSyncAt;
    this.iotStatus = iotStatus;
    this.linkedDeviceCount = linkedDeviceCount;
    this.onlineDeviceCount = onlineDeviceCount;
    this.iotLastActivityAt = iotLastActivityAt;
    this.devices = devices;
    this.activity = activity;
  }

  get areaLabel(): string {
    return `${this.areaSizeHectares.toFixed(1)} ha`;
  }

  /** Backend marks a closed, geometrically valid boundary as VALIDATED. */
  get boundaryValidated(): boolean {
    return this.boundaryStatus.trim().toUpperCase() === 'VALIDATED';
  }

  get hasIot(): boolean {
    return this.linkedDeviceCount > 0;
  }
}
