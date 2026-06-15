/**
 * @file plot-weather-forecast.assembler.ts
 * @description Maps GET /plots/{plotId}/weather-forecast into the WeatherSummary
 * entity: current conditions, hourly strip, multi-day forecast, humidity/wind/
 * precipitation, thermal anomaly, climate risk and backend warnings.
 */
import {
  WeatherForecastDay,
  WeatherHour,
  WeatherSummary,
  WeatherWarning,
} from '../domain/model/weather-summary.entity';

import {
  DailyForecastResource,
  HourlyForecastResource,
  PlotWeatherForecastResource,
  WeatherWarningResource,
} from './plot-weather-forecast-response';
import { normalizeClimateRisk, normalizeWeatherCondition } from './status-normalizers';

/** Metres-per-second → km/h, rounded to a whole number. */
const MPS_TO_KMH = 3.6;

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
      // Keep ALL available days (the backend returns ~6); consumers slice.
      forecast3Days: (resource?.daily ?? []).map((day) => this.toForecastDay(day)),
      temperatureAnomaly: resource?.thermalAnomalyCelsius ?? 0,
      climateRisk: normalizeClimateRisk(resource?.overallRisk),
      humidity: Math.round(
        firstHour?.humidityPercentage ?? firstDay?.averageHumidityPercentage ?? 0,
      ),
      windSpeedKmh: this.toKmh(firstHour?.windSpeedMetersPerSecond),
      windGustKmh: this.toKmh(
        firstHour?.windGustMetersPerSecond ?? firstDay?.maxWindGustMetersPerSecond,
      ),
      precipitationMm: this.round1(
        firstHour?.precipitationMillimeters ?? firstDay?.totalPrecipitationMillimeters ?? 0,
      ),
      hourly: (resource?.hourly ?? []).map((hour) => this.toHour(hour)),
      warnings: (resource?.warnings ?? []).map((warning) => this.toWarning(warning)),
    });
  }

  private static toForecastDay(day: DailyForecastResource): WeatherForecastDay {
    return {
      dayLabel: this.toDayLabel(day.date),
      date: day.date ?? '',
      minTemp: day.minTemperatureCelsius ?? 0,
      maxTemp: day.maxTemperatureCelsius ?? 0,
      condition: normalizeWeatherCondition(day.dominantStatus),
      status: (day.dominantStatus ?? '').trim().toUpperCase(),
    };
  }

  private static toHour(hour: HourlyForecastResource): WeatherHour {
    return {
      time: hour.timestamp ?? '',
      temp: hour.temperatureCelsius ?? 0,
      status: (hour.weatherStatus ?? '').trim().toUpperCase(),
      precipitationMm: this.round1(hour.precipitationMillimeters ?? 0),
    };
  }

  private static toWarning(warning: WeatherWarningResource): WeatherWarning {
    return {
      type: warning.type ?? '',
      severity: (warning.severity ?? '').trim().toUpperCase(),
      message: warning.message ?? '',
      date: warning.date ?? '',
    };
  }

  private static toKmh(value: number | null | undefined): number {
    return value ? Math.round(value * MPS_TO_KMH) : 0;
  }

  private static round1(value: number | null | undefined): number {
    return value ? Math.round(value * 10) / 10 : 0;
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
