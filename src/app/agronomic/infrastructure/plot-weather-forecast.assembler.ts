/**
 * @file plot-weather-forecast.assembler.ts
 * @description Maps GET /plots/{plotId}/weather-forecast into the WeatherSummary
 * entity (current conditions + 3-day forecast + thermal anomaly + risk).
 */
import {
  WeatherForecastDay,
  WeatherSummary,
} from '../domain/model/weather-summary.entity';

import {
  DailyForecastResource,
  HourlyForecastResource,
  PlotWeatherForecastResource,
} from './plot-weather-forecast-response';
import { normalizeClimateRisk, normalizeWeatherCondition } from './status-normalizers';

export class PlotWeatherForecastAssembler {
  static toEntityFromResource(
    resource: PlotWeatherForecastResource | null | undefined,
  ): WeatherSummary {
    const firstHour: HourlyForecastResource | undefined = resource?.hourly?.[0];
    const firstDay: DailyForecastResource | undefined = resource?.daily?.[0];

    const currentTemp =
      firstHour?.temperatureCelsius ?? firstDay?.averageTemperatureCelsius ?? 0;
    const condition = normalizeWeatherCondition(
      firstHour?.weatherStatus ?? firstDay?.dominantStatus,
    );

    return new WeatherSummary({
      city: resource?.plotName ?? '',
      currentTemp,
      condition,
      lastUpdate: resource?.generatedAt ?? '',
      forecast3Days: (resource?.daily ?? []).slice(0, 3).map((day) => this.toForecastDay(day)),
      temperatureAnomaly: resource?.thermalAnomalyCelsius ?? 0,
      climateRisk: normalizeClimateRisk(resource?.overallRisk),
    });
  }

  private static toForecastDay(day: DailyForecastResource): WeatherForecastDay {
    return {
      dayLabel: this.toDayLabel(day.date),
      minTemp: day.minTemperatureCelsius ?? 0,
      maxTemp: day.maxTemperatureCelsius ?? 0,
      condition: normalizeWeatherCondition(day.dominantStatus),
    };
  }

  private static toDayLabel(date: string | undefined): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
