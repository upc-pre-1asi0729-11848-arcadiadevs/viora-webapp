/**
 * @file yield-forecast.entity.ts
 * @description Domain entity representing expected crop yield predictions.
 */

export type YieldForecastId = number | string | null;

export type YieldForecastPlotId = number | string | null;

export type YieldRiskLevel = 'Low' | 'Moderate' | 'High';

export interface YieldForecastProperties {
  id?: YieldForecastId;
  plotId?: YieldForecastPlotId;
  tonnes?: number;
  riskLevel?: YieldRiskLevel;
  description?: string;
}

export class YieldForecast {
  readonly id: YieldForecastId;
  readonly plotId: YieldForecastPlotId;
  readonly tonnes: number;
  readonly riskLevel: YieldRiskLevel;
  readonly description: string;

  /**
   * @param {YieldForecastProperties} params - Entity data.
   * @param {YieldForecastId} [params.id] - Unique identifier.
   * @param {YieldForecastPlotId} [params.plotId] - Associated plot ID.
   * @param {number} [params.tonnes] - Forecasted yield in tonnes.
   * @param {YieldRiskLevel} [params.riskLevel] - Risk level of the forecast.
   * @param {string} [params.description] - Description or observation.
   */
  constructor({
                id = null,
                plotId = null,
                tonnes = 0,
                riskLevel = 'Low',
                description = ''
              }: YieldForecastProperties = {}) {
    this.id = id;
    this.plotId = plotId;
    this.tonnes = tonnes;
    this.riskLevel = riskLevel;
    this.description = description;
  }

  get tonnesLabel(): string {
    return `${this.tonnes.toFixed(1)} t`;
  }

  get hasAlternateBearingRisk(): boolean {
    return this.riskLevel === 'Moderate' || this.riskLevel === 'High';
  }

  get isHighRisk(): boolean {
    return this.riskLevel === 'High';
  }
}
