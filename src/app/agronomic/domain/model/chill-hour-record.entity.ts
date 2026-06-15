/**
 * @file chill-hour-record.entity.ts
 * @description Domain entity representing chill hour accumulation records.
 */

export type ChillHourRecordId = number | string | null;

export type ChillHourRecordPlotId = number | string | null;

/**
 * Accumulation unit: Chill Portions (per plot) or chill Hours (All Plots
 * aggregate, where the backend only exposes accumulated chill hours).
 */
export type ChillUnit = 'CP' | 'h';

export interface ChillHourRecordProperties {
  id?: ChillHourRecordId;
  plotId?: ChillHourRecordPlotId;
  accumulatedChillPortions?: number;
  weeklyDiff?: number;
  threshold?: number;
  unit?: ChillUnit;
  generatedAt?: string;
}

export class ChillHourRecord {
  readonly id: ChillHourRecordId;
  readonly plotId: ChillHourRecordPlotId;
  readonly accumulatedChillPortions: number;
  readonly weeklyDiff: number;
  readonly threshold: number;
  readonly unit: ChillUnit;
  readonly generatedAt: string;

  /**
   * @param {ChillHourRecordProperties} params - Entity data.
   * @param {ChillHourRecordId} [params.id] - Unique identifier.
   * @param {ChillHourRecordPlotId} [params.plotId] - Associated plot ID.
   * @param {number} [params.accumulatedChillPortions] - Accumulated CP.
   * @param {number} [params.weeklyDiff] - Weekly difference in CP.
   * @param {number} [params.threshold] - Target threshold for CP.
   * @param {string} [params.generatedAt] - Record generation timestamp.
   */
  constructor({
                id = null,
                plotId = null,
                accumulatedChillPortions = 0,
                weeklyDiff = 0,
                threshold = 600,
                unit = 'CP',
                generatedAt = ''
              }: ChillHourRecordProperties = {}) {
    this.id = id;
    this.plotId = plotId;
    this.accumulatedChillPortions = accumulatedChillPortions;
    this.weeklyDiff = weeklyDiff;
    this.threshold = threshold;
    this.unit = unit;
    this.generatedAt = generatedAt;
  }

  get chillPortionsLabel(): string {
    return `${this.accumulatedChillPortions} CP`;
  }

  /**
   * Accumulation value with its actual unit (CP for plots, h for All Plots).
   */
  get valueLabel(): string {
    const rounded = Math.round(this.accumulatedChillPortions);

    return this.unit === 'h' ? `${rounded} h` : `${rounded} CP`;
  }

  /**
   * Chill requirement target with its unit (e.g. "90 CP"), shown alongside the
   * accumulation in the detailed Plot Overview card.
   */
  get thresholdLabel(): string {
    const rounded = Math.round(this.threshold);

    return this.unit === 'h' ? `${rounded} h` : `${rounded} CP`;
  }

  /**
   * Weekly chill gain rounded to whole portions for display. Chill deltas arrive
   * fractional from the model, so the pill both rounds and is hidden when the
   * rounded gain is zero (see the card's guard).
   */
  get weeklyDiffRounded(): number {
    return Math.round(this.weeklyDiff);
  }

  get weeklyDiffLabel(): string {
    const sign = this.weeklyDiffRounded >= 0 ? '+' : '-';
    const value = Math.abs(this.weeklyDiffRounded);

    return `${sign}${value} from last week`;
  }

  get isImproving(): boolean {
    return this.weeklyDiff > 0;
  }

  get isDeclining(): boolean {
    return this.weeklyDiff < 0;
  }

  get progressPercentage(): number {
    if (this.threshold <= 0) {
      return 0;
    }

    return Math.min(
      Math.round((this.accumulatedChillPortions / this.threshold) * 100),
      100
    );
  }

  get remainingChillPortions(): number {
    return Math.max(this.threshold - this.accumulatedChillPortions, 0);
  }

  /** Chill still needed to reach the requirement, with its unit (e.g. "40 CP"). */
  get remainingLabel(): string {
    const rounded = Math.round(this.remainingChillPortions);

    return this.unit === 'h' ? `${rounded} h` : `${rounded} CP`;
  }

  get hasStartedAccumulating(): boolean {
    return this.accumulatedChillPortions > 0;
  }

  get hasReachedThreshold(): boolean {
    return this.accumulatedChillPortions >= this.threshold;
  }

  get generatedAtDate(): Date | null {
    if (!this.generatedAt) {
      return null;
    }

    const parsedDate = new Date(this.generatedAt);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
}
