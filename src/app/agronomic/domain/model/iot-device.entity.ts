/**
 * @file iot-device.entity.ts
 * @description Domain entity representing an individual IoT sensor device.
 */

export type IotDeviceId = number | string | null;
export type IotDevicePlotId = number | string | null;
export type IotDeviceStatus = 'active' | 'warning' | 'critical' | 'inactive';

/**
 * Kind of physical sensor, derived from the device's activation code prefix.
 * Determines which metrics the device reports:
 * - `soil-probe`: soil moisture + soil temperature
 * - `leaf-wetness`: leaf humidity
 * - `weather-station`: all three
 * - `unknown`: legacy/unspecified — assumed to report everything.
 */
export type IotDeviceType = 'soil-probe' | 'leaf-wetness' | 'weather-station' | 'unknown';

export interface IotDeviceProperties {
  id?: IotDeviceId;
  name?: string;
  plotId?: IotDevicePlotId;
  deviceType?: IotDeviceType;
  soilMoisture?: number;
  temperature?: number;
  leafHumidity?: number;
  status?: IotDeviceStatus;
  lastUpdate?: string;
  /** One-time activation/claim code; only carried on registration (input-only). */
  activationCode?: string;
}

export class IotDevice {
  readonly id: IotDeviceId;
  readonly name: string;
  readonly plotId: IotDevicePlotId;
  readonly deviceType: IotDeviceType;
  readonly soilMoisture: number;
  readonly temperature: number;
  readonly leafHumidity: number;
  readonly status: IotDeviceStatus;
  readonly lastUpdate: string;
  readonly activationCode: string;

  /**
   * @param {IotDeviceProperties} params - Entity data.
   * @param {IotDeviceId} [params.id] - Unique identifier.
   * @param {string} [params.name] - Device name.
   * @param {IotDevicePlotId} [params.plotId] - Associated plot ID.
   * @param {IotDeviceType} [params.deviceType] - Sensor kind (from activation code).
   * @param {number} [params.soilMoisture] - Soil moisture reading.
   * @param {number} [params.temperature] - Soil temperature reading.
   * @param {number} [params.leafHumidity] - Leaf humidity reading.
   * @param {IotDeviceStatus} [params.status] - Device status.
   * @param {string} [params.lastUpdate] - Last update timestamp.
   * @param {string} [params.activationCode] - One-time claim code (registration only).
   */
  constructor({
                id = null,
                name = '',
                plotId = null,
                deviceType = 'unknown',
                soilMoisture = 0,
                temperature = 0,
                leafHumidity = 0,
                status = 'active',
                lastUpdate = '',
                activationCode = ''
              }: IotDeviceProperties = {}) {
    this.id = id;
    this.name = name;
    this.plotId = plotId;
    this.deviceType = deviceType;
    this.soilMoisture = soilMoisture;
    this.temperature = temperature;
    this.leafHumidity = leafHumidity;
    this.status = status;
    this.lastUpdate = lastUpdate;
    this.activationCode = activationCode;
  }

  get soilMoistureLabel(): string {
    return `${this.soilMoisture}%`;
  }

  get temperatureLabel(): string {
    return `${this.temperature}°C`;
  }

  get leafHumidityLabel(): string {
    return `${this.leafHumidity}%`;
  }

  /** Whether this sensor reports soil moisture (soil probes + weather stations). */
  get measuresSoilMoisture(): boolean {
    return this.deviceType !== 'leaf-wetness';
  }

  /** Whether this sensor reports soil temperature (soil probes + weather stations). */
  get measuresSoilTemperature(): boolean {
    return this.deviceType !== 'leaf-wetness';
  }

  /** Whether this sensor reports leaf humidity (leaf-wetness sensors + weather stations). */
  get measuresLeafHumidity(): boolean {
    return this.deviceType !== 'soil-probe';
  }

  get formattedLastUpdate(): string {
    if (!this.lastUpdate) return 'No update';

    const date = new Date(this.lastUpdate);

    if (Number.isNaN(date.getTime())) return 'No update';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  get requiresAttention(): boolean {
    return this.status === 'warning' || this.status === 'critical' || this.soilMoisture < 20;
  }
}
