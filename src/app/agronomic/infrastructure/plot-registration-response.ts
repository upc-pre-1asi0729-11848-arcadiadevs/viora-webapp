/**
 * @file plot-registration-response.ts
 * @description Request/response payloads for POST /plots (real backend).
 */
import { PlotCoordinateResource } from './plots-response';

/** CreatePlotResource — request body for POST /api/v1/plots. */
export interface CreatePlotResource {
  userId: number;
  name: string;
  polygonCoordinates: PlotCoordinateResource[];
  cropType?: string;
  variety?: string;
  location?: string;
  campaign?: string;
  notes?: string;
}

/** PlotRegistrationResource — response body for POST /api/v1/plots. */
export interface PlotRegistrationResource {
  id?: number;
  userId?: number;
  name?: string;
  polygonCoordinates?: PlotCoordinateResource[];
  areaSizeHectares?: number;
  cropType?: string;
  variety?: string;
  location?: string;
  campaign?: string;
  notes?: string;
  state?: string;
  climateMonitoring?: string;
  satelliteNdvi?: string;
  iotDevices?: string;
}
