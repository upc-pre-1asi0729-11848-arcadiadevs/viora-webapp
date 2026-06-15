/**
 * @file overall-plot-health.entity.ts
 * @description Domain entity representing the aggregated health status of all plots.
 */

export type OverallPlotHealthStatus =
  | 'Healthy'
  | 'Warning'
  | 'Moderate'
  | 'Critical';

export interface OverallPlotHealthProperties {
  status?: OverallPlotHealthStatus;
  healthyPlotsCount?: number;
  reviewPlotsCount?: number;
}

export class OverallPlotHealth {
  readonly status: OverallPlotHealthStatus;
  readonly healthyPlotsCount: number;
  readonly reviewPlotsCount: number;

  /**
   * @param {OverallPlotHealthProperties} params - Entity data.
   * @param {OverallPlotHealthStatus} [params.status] - Overall status label.
   * @param {number} [params.healthyPlotsCount] - Number of healthy plots.
   * @param {number} [params.reviewPlotsCount] - Number of plots with moderate health.
   */
  constructor({
                status = 'Healthy',
                healthyPlotsCount = 0,
                reviewPlotsCount = 0
              }: OverallPlotHealthProperties = {}) {
    this.status = status;
    this.healthyPlotsCount = healthyPlotsCount;
    this.reviewPlotsCount = reviewPlotsCount;
  }

  get totalPlotsCount(): number {
    return this.healthyPlotsCount + this.reviewPlotsCount;
  }

  get isCritical(): boolean {
    return this.reviewPlotsCount > this.healthyPlotsCount || this.status === 'Critical';
  }

  get requiresAttention(): boolean {
    return this.reviewPlotsCount > 0 || this.status !== 'Healthy';
  }

  get summaryLabel(): string {
    return `${this.healthyPlotsCount} plots healthy / ${this.reviewPlotsCount} moderate plots`;
  }

  get healthyPercentage(): number {
    if (this.totalPlotsCount === 0) {
      return 0;
    }

    return Math.round((this.healthyPlotsCount / this.totalPlotsCount) * 100);
  }

  get reviewPercentage(): number {
    if (this.totalPlotsCount === 0) {
      return 0;
    }

    return Math.round((this.reviewPlotsCount / this.totalPlotsCount) * 100);
  }
}
