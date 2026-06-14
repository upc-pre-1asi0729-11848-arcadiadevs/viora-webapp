/**
 * @file plot-weather-forecast-response.ts
 * @description API resource payload for GET /plots/{plotId}/weather-forecast.
 */
import { DataSourceResource } from './plot-monitoring-summary-response';

export interface HourlyForecastResource {
  timestamp?: string;
  temperatureCelsius?: number;
  weatherStatus?: string;
  humidityPercentage?: number;
  precipitationMillimeters?: number;
  windSpeedMetersPerSecond?: number;
  windGustMetersPerSecond?: number;
}

export interface DailyForecastResource {
  date?: string;
  minTemperatureCelsius?: number;
  maxTemperatureCelsius?: number;
  averageTemperatureCelsius?: number;
  dominantStatus?: string;
  averageHumidityPercentage?: number;
  totalPrecipitationMillimeters?: number;
  maxWindGustMetersPerSecond?: number;
}

export interface WeatherWarningResource {
  type?: string;
  severity?: string;
  date?: string;
  message?: string;
}

export interface PlotWeatherForecastResource {
  plotId?: number | string | null;
  userId?: number | string | null;
  plotName?: string;
  generatedAt?: string;
  hourly?: HourlyForecastResource[];
  daily?: DailyForecastResource[];
  thermalAnomalyCelsius?: number;
  overallRisk?: string;
  warnings?: WeatherWarningResource[];
  source?: DataSourceResource | null;
}
