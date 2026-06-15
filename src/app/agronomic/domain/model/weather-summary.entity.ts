/**
 * @file weather-summary.entity.ts
 * @description Domain entity representing local weather conditions.
 */

export type ClimateRiskLevel = 'Low' | 'Medium' | 'High';

export type WeatherSummaryId = number | string | null;

export interface WeatherForecastDay {
  dayLabel: string;
  /** ISO date (YYYY-MM-DD) so consumers can label "Today" / weekday. */
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
  /** Raw backend status (e.g. SUNNY) used to pick the icon. */
  status: string;
}

/** A single hour of the forecast strip. */
export interface WeatherHour {
  /** ISO timestamp. */
  time: string;
  temp: number;
  /** Raw backend status (e.g. SUNNY) used to pick the icon/label. */
  status: string;
  precipitationMm: number;
}

/** A backend-issued weather warning. */
export interface WeatherWarning {
  type: string;
  severity: string;
  message: string;
  date: string;
}

export interface WeatherSummaryProperties {
  id?: WeatherSummaryId;
  city?: string;
  currentTemp?: number;
  condition?: string;
  lastUpdate?: string;
  icon?: string;
  backgroundImage?: string;
  forecast3Days?: WeatherForecastDay[];
  temperatureAnomaly?: number;
  climateRisk?: ClimateRiskLevel;
  humidity?: number;
  windSpeedKmh?: number;
  windGustKmh?: number;
  precipitationMm?: number;
  hourly?: WeatherHour[];
  warnings?: WeatherWarning[];
}

export class WeatherSummary {
  readonly id: WeatherSummaryId;
  readonly city: string;
  readonly currentTemp: number;
  readonly condition: string;
  readonly lastUpdate: string;
  readonly icon: string;
  readonly backgroundImage: string;
  readonly forecast3Days: WeatherForecastDay[];
  readonly temperatureAnomaly: number;
  readonly climateRisk: ClimateRiskLevel;
  readonly humidity: number;
  readonly windSpeedKmh: number;
  readonly windGustKmh: number;
  readonly precipitationMm: number;
  readonly hourly: WeatherHour[];
  readonly warnings: WeatherWarning[];

  /**
   * @param {WeatherSummaryProperties} params - Entity data.
   * @param {WeatherSummaryId} [params.id] - Unique identifier.
   * @param {string} [params.city] - City name.
   * @param {number} [params.currentTemp] - Current temperature.
   * @param {string} [params.condition] - Weather condition description.
   * @param {string} [params.lastUpdate] - Last update timestamp.
   * @param {string} [params.icon] - Weather icon code/URL.
   * @param {string} [params.backgroundImage] - Background image URL.
   * @param {WeatherForecastDay[]} [params.forecast3Days] - Forecast data.
   * @param {number} [params.temperatureAnomaly] - Temp anomaly value.
   * @param {ClimateRiskLevel} [params.climateRisk] - Climate risk level.
   */
  constructor({
                id = null,
                city = '',
                currentTemp = 0,
                condition = '',
                lastUpdate = '',
                icon = '',
                backgroundImage = '',
                forecast3Days = [],
                temperatureAnomaly = 0,
                climateRisk = 'Low',
                humidity = 0,
                windSpeedKmh = 0,
                windGustKmh = 0,
                precipitationMm = 0,
                hourly = [],
                warnings = []
              }: WeatherSummaryProperties = {}) {
    this.id = id;
    this.city = city;
    this.currentTemp = currentTemp;
    this.condition = condition;
    this.lastUpdate = lastUpdate;
    this.icon = icon;
    this.backgroundImage = backgroundImage;
    this.forecast3Days = forecast3Days;
    this.temperatureAnomaly = temperatureAnomaly;
    this.climateRisk = climateRisk;
    this.humidity = humidity;
    this.windSpeedKmh = windSpeedKmh;
    this.windGustKmh = windGustKmh;
    this.precipitationMm = precipitationMm;
    this.hourly = hourly;
    this.warnings = warnings;
  }

  get temperatureLabel(): string {
    return `${this.currentTemp.toFixed(0)}°`;
  }

  get anomalyLabel(): string {
    const absoluteValue = Math.abs(this.temperatureAnomaly).toFixed(1);

    if (this.temperatureAnomaly > 0) {
      return `+${absoluteValue}°C`;
    }

    if (this.temperatureAnomaly < 0) {
      return `-${absoluteValue}°C`;
    }

    return `${absoluteValue}°C`;
  }

  get updatedAtDate(): Date | null {
    if (!this.lastUpdate) {
      return null;
    }

    const parsedDate = new Date(this.lastUpdate);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  get updateTimeLabel(): string {
    const updatedAt = this.updatedAtDate;

    if (!updatedAt) {
      return '';
    }

    return updatedAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  }

  get hasSignificantTemperatureAnomaly(): boolean {
    return Math.abs(this.temperatureAnomaly) > 5;
  }

  get requiresClimateAttention(): boolean {
    return this.climateRisk === 'Medium' || this.climateRisk === 'High';
  }

  get isHighThermalRisk(): boolean {
    return this.climateRisk === 'High' || this.hasSignificantTemperatureAnomaly;
  }
}
