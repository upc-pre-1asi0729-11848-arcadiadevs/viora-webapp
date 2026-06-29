/**
 * @file iot-devices-response.ts
 * @description API resource + request payloads for IoT Devices, served by the
 * real Viora Platform backend. Reads return live (simulated) telemetry enriched
 * server-side from the plot's weather; writes carry only provisioning metadata.
 */
import { BaseResource } from '../../shared/infrastructure/base-response';

export interface IotDeviceResource extends BaseResource {
  /** Backend serializes the name as `deviceName`; `name` kept as a fallback. */
  deviceName?: string;
  name?: string;
  plotId?: number | string | null;
  /** Backend enum: SOIL_PROBE | LEAF_WETNESS | WEATHER_STATION. */
  deviceType?: string;
  soilMoisture?: number;
  temperature?: number;
  leafHumidity?: number;
  status?: string;
  lastUpdate?: string;
}

/**
 * Body for POST /api/v1/plots/{plotId}/iot-devices (device claiming).
 * `status` is the backend IoTDeviceStatus enum name (UPPERCASE).
 */
export interface CreateIotDeviceRequest {
  deviceName: string;
  status: string;
  activationCode: string;
}

/**
 * Body for PATCH /api/v1/plots/{plotId}/iot-devices/{deviceId}.
 * The backend field is `iotDeviceStatus` (parsed case-insensitively).
 */
export interface UpdateIotDeviceRequest {
  deviceName: string;
  iotDeviceStatus: string;
}
