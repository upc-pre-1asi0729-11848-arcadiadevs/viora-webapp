/**
 * @file agronomic-statistic-series.assembler.ts
 * @description Maps GET /agronomic-statistics/series into the AgronomicStatistics
 * entity that powers the Trend Analysis chart.
 */
import {
  AgronomicStatistics,
  AgronomicTimeRange,
  AgronomicTrend,
} from '../domain/model/agronomic-statistics.entity';

import { AgronomicStatisticSeriesResource } from './agronomic-statistic-series-response';

export class AgronomicStatisticSeriesAssembler {
  static toEntityFromResource(
    resource: AgronomicStatisticSeriesResource | null | undefined,
  ): AgronomicStatistics {
    return new AgronomicStatistics({
      plotId: resource?.plotId ?? null,
      timeRange: this.toTimeRange(resource?.timeRange),
      labels: this.toShortLabels(resource?.labels ?? []),
      ndviSeries: resource?.ndviSeries ?? [],
      cpSeries: resource?.cpSeries ?? [],
      threshold: resource?.threshold ?? 600,
      observation: resource?.observation ?? '',
      description: resource?.observation ?? '',
      trend: this.toTrend(resource?.trend),
      statusLabel: resource?.statusLabel ?? 'Stable',
    });
  }

  /** Maps the backend TimeRange enum name to the frontend range value. */
  private static toTimeRange(value: string | undefined): AgronomicTimeRange {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'LAST_7_DAYS':
        return '7days';
      case 'CAMPAIGN':
        return 'campaign';
      case 'LAST_30_DAYS':
      default:
        return '30days';
    }
  }

  private static toTrend(value: string | undefined): AgronomicTrend {
    const validTrends: AgronomicTrend[] = ['Stable', 'Up', 'Down', 'Review'];

    return validTrends.includes(value as AgronomicTrend) ? (value as AgronomicTrend) : 'Stable';
  }

  /** Shortens ISO date labels (YYYY-MM-DD) to MM/DD for the chart axis. */
  private static toShortLabels(labels: string[]): string[] {
    return labels.map((label) => {
      const parsed = new Date(label);

      if (Number.isNaN(parsed.getTime())) {
        return label;
      }

      const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
      const day = `${parsed.getDate()}`.padStart(2, '0');

      return `${month}/${day}`;
    });
  }
}
