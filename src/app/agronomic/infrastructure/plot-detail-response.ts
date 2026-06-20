/**
 * @file plot-detail-response.ts
 * @description API resource for GET /plots/{plotId}?view=detail (real backend).
 */
import { PlotCoordinateResource } from './plots-response';

export interface MonitoringLinksResource {
  climateMonitoring?: string;
  satelliteNdvi?: string;
  climateLastSyncAt?: string | null;
  satelliteLastSyncAt?: string | null;
}

export interface IoTSummaryResource {
  status?: string;
  linkedDeviceCount?: number;
  onlineDeviceCount?: number;
  lastActivityAt?: string | null;
}

export interface IoTDeviceDetailResource {
  id?: number;
  name?: string;
  status?: string;
  linkedAt?: string | null;
  lastActivityAt?: string | null;
}

export interface ConfigurationActivityResource {
  type?: string;
  description?: string;
  occurredAt?: string | null;
}

export interface PlotDetailResource {
  id?: number;
  userId?: number;
  name?: string;
  location?: string;
  campaign?: string;
  cropType?: string;
  variety?: string;
  notes?: string;
  polygonCoordinates?: PlotCoordinateResource[];
  areaSizeHectares?: number;
  boundaryPointCount?: number;
  boundaryStatus?: string;
  registeredAt?: string | null;
  lastConfigurationUpdateAt?: string | null;
  monitoringLinks?: MonitoringLinksResource;
  iot?: IoTSummaryResource;
  devices?: IoTDeviceDetailResource[];
  recentConfigurationActivity?: ConfigurationActivityResource[];
}
