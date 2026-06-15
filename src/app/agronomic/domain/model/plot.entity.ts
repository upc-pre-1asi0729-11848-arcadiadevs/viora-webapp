/**
 * @file plot.entity.ts
 * @description Domain entity representing a physical agronomic plot.
 */
import { SatelliteImagery } from './satellite-imagery.entity';

export type PlotHealthStatus = 'Healthy' | 'Moderate' | 'Critical';
export type PhenologicalRiskLevel = 'Low' | 'Moderate' | 'High';
export type PlotId = number | string | null;

export type PlotCoordinate = [longitude: number, latitude: number];

export interface PlotProperties {
  id?: PlotId;
  name?: string;
  polygonCoordinates?: PlotCoordinate[];
  areaSize?: number;
  lastUpdate?: string;
  currentImagery?: SatelliteImagery | null;
  healthStatus?: PlotHealthStatus;
  phenologicalRisk?: PhenologicalRiskLevel;
  cropType?: string;
  variety?: string;
  location?: string;
  campaign?: string;
  notes?: string;
}

export class Plot {
  readonly id: PlotId;
  readonly name: string;
  readonly polygonCoordinates: PlotCoordinate[];
  readonly areaSize: number;
  readonly lastUpdate: string;
  readonly currentImagery: SatelliteImagery | null;
  readonly healthStatus: PlotHealthStatus;
  readonly phenologicalRisk: PhenologicalRiskLevel;
  /** Descriptive fields carried for the edit form (the dashboard ignores them). */
  readonly cropType: string;
  readonly variety: string;
  readonly location: string;
  readonly campaign: string;
  readonly notes: string;

  /**
   * @param {PlotProperties} params - Entity data.
   * @param {PlotId} [params.id] - Unique identifier.
   * @param {string} [params.name] - Name of the plot.
   * @param {PlotCoordinate[]} [params.polygonCoordinates] - Geographical coordinates.
   * @param {number} [params.areaSize] - Size in hectares.
   * @param {string} [params.lastUpdate] - Last update timestamp.
   * @param {SatelliteImagery|null} [params.currentImagery] - Current satellite imagery.
   * @param {PlotHealthStatus} [params.healthStatus] - Health status.
   * @param {PhenologicalRiskLevel} [params.phenologicalRisk] - Phenological risk level.
   */
  constructor({
    id = null,
    name = '',
    polygonCoordinates = [],
    areaSize = 0,
    lastUpdate = '',
    currentImagery = null,
    healthStatus = 'Healthy',
    phenologicalRisk = 'Low',
    cropType = '',
    variety = '',
    location = '',
    campaign = '',
    notes = '',
  }: PlotProperties = {}) {
    this.id = id;
    this.name = name;
    this.polygonCoordinates = polygonCoordinates;
    this.areaSize = areaSize;
    this.lastUpdate = lastUpdate;
    this.currentImagery = currentImagery;
    this.healthStatus = healthStatus;
    this.phenologicalRisk = phenologicalRisk;
    this.cropType = cropType;
    this.variety = variety;
    this.location = location;
    this.campaign = campaign;
    this.notes = notes;
  }

  calculateCurrentBiomass(ndviValue: number): number {
    if (!Number.isFinite(this.areaSize) || !Number.isFinite(ndviValue)) {
      return 0;
    }

    return Number((this.areaSize * ndviValue).toFixed(2));
  }

  get hasValidPolygon(): boolean {
    return this.polygonCoordinates.length >= 4;
  }

  get isPolygonClosed(): boolean {
    if (!this.hasValidPolygon) {
      return false;
    }

    const firstCoordinate = this.polygonCoordinates[0];
    const lastCoordinate = this.polygonCoordinates[this.polygonCoordinates.length - 1];

    return firstCoordinate[0] === lastCoordinate[0] && firstCoordinate[1] === lastCoordinate[1];
  }

  get areaSizeLabel(): string {
    return `${this.areaSize.toFixed(1)} ha`;
  }

  get isHealthy(): boolean {
    return this.healthStatus === 'Healthy';
  }

  get requiresReview(): boolean {
    return this.healthStatus === 'Moderate' || this.phenologicalRisk !== 'Low';
  }

  get isOffline(): boolean {
    if (!this.lastUpdate) {
      return true;
    }

    const lastUpdateTimestamp = Date.parse(this.lastUpdate);

    if (Number.isNaN(lastUpdateTimestamp)) {
      return true;
    }

    const diffInHours = (Date.now() - lastUpdateTimestamp) / (1000 * 60 * 60);

    return diffInHours > 24;
  }
}
