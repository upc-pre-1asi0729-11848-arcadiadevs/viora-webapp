/**
 * @file plots-response.ts
 * @description API resource payload definition for Plots data.
 */
import {
  BaseResource,
  BaseResponse,
  CollectionResponse,
} from '../../shared/infrastructure/base-response';

import { SatelliteImageryResource } from './satellite-imagery-response';

export type PlotCoordinateResource = [number, number];

/**
 * GET /plots?userId&includeCurrentImagery=true returns a plain array of these.
 * Note: the real backend currently serializes `healthStatus` and
 * `phenologicalRisk` as null on this endpoint; per-plot health is sourced from
 * /plots/overview and /plots/{plotId}/monitoring-summary instead.
 */
export interface PlotResource extends BaseResource {
  userId?: number | string | null;
  name?: string;
  polygonCoordinates?: PlotCoordinateResource[];
  areaSize?: number;
  lastUpdate?: string;
  cropType?: string;
  variety?: string;
  location?: string;
  campaign?: string;
  notes?: string;
  state?: string;
  healthStatus?: string | null;
  phenologicalRisk?: string | null;
  currentImagery?: SatelliteImageryResource | null;
}

export interface PlotsResponse extends BaseResponse {
  plots: PlotResource[];
}

export type PlotCollectionResponse = CollectionResponse<PlotResource, 'plots'>;
