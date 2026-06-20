/**
 * @file my-plots-overview-response.ts
 * @description API resource payload for GET /plots?view=overview (real backend).
 */
import { PlotCoordinateResource } from './plots-response';

export interface MyPlotOverviewItemResource {
  id?: number;
  userId?: number;
  name?: string;
  location?: string;
  campaign?: string;
  cropType?: string;
  variety?: string;
  polygonCoordinates?: PlotCoordinateResource[];
  areaSizeHectares?: number;
  currentNdvi?: number;
  chillPortions?: number;
  healthStatus?: string;
  phenologicalRisk?: string;
  onlineDeviceCount?: number;
  activeAlertCount?: number;
  lastUpdatedAt?: string;
  climateMonitoring?: string;
  satelliteNdvi?: string;
}

export interface MyPlotsOverviewResource {
  registeredPlotCount?: number;
  monitoredAreaHectares?: number;
  climateLinkedPlotCount?: number;
  onlineDeviceCount?: number;
  plots?: MyPlotOverviewItemResource[];
}
