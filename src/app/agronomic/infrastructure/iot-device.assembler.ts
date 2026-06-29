/**
 * @file iot-device.assembler.ts
 * @description Maps IoT device REST resources to domain entities and builds the
 * provisioning request bodies (create/update) for the real backend.
 */
import {
  IotDevice,
  IotDeviceHealth,
  IotDeviceStatus,
  IotDeviceType,
} from '../domain/model/iot-device.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  CreateIotDeviceRequest,
  IotDeviceResource,
  UpdateIotDeviceRequest,
} from './iot-devices-response';

export class IotDeviceAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {IotDeviceResource} resource - Raw data point.
   * @returns {IotDevice}
   */
  static toEntityFromResource(resource: IotDeviceResource | null | undefined): IotDevice {
    return new IotDevice({
      id: resource?.id ?? null,
      name: resource?.deviceName ?? resource?.name ?? '',
      plotId: resource?.plotId ?? null,
      deviceType: this.toDeviceType(resource?.deviceType),
      soilMoisture: resource?.soilMoisture ?? 0,
      temperature: resource?.temperature ?? 0,
      leafHumidity: resource?.leafHumidity ?? 0,
      status: this.toStatus(resource?.status),
      health: this.toHealth(resource?.health),
      lastUpdate: resource?.lastUpdate ?? '',
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {IotDeviceResource[]} resources - Array of raw data points.
   * @returns {IotDevice[]}
   */
  static toEntitiesFromResources(resources: IotDeviceResource[] = []): IotDevice[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }

  /** Builds the POST body to claim a new device against a plot. */
  static toCreateRequest(device: IotDevice): CreateIotDeviceRequest {
    return {
      deviceName: device.name,
      status: device.status.toUpperCase(),
      activationCode: device.activationCode,
    };
  }

  /** Builds the PATCH body to update a device's metadata. */
  static toUpdateRequest(device: IotDevice): UpdateIotDeviceRequest {
    return {
      deviceName: device.name,
      iotDeviceStatus: device.status.toUpperCase(),
    };
  }

  private static toStatus(value: string | undefined): IotDeviceStatus {
    const validStatuses: IotDeviceStatus[] = ['active', 'warning', 'critical', 'inactive'];
    const normalized = value?.toLowerCase();

    return validStatuses.includes(normalized as IotDeviceStatus)
      ? (normalized as IotDeviceStatus)
      : 'active';
  }

  private static toHealth(value: string | undefined): IotDeviceHealth {
    const validHealth: IotDeviceHealth[] = ['healthy', 'warning', 'critical', 'unknown'];
    const normalized = value?.toLowerCase();

    return validHealth.includes(normalized as IotDeviceHealth)
      ? (normalized as IotDeviceHealth)
      : 'unknown';
  }

  private static toDeviceType(value: string | undefined): IotDeviceType {
    switch (value?.toUpperCase()) {
      case 'SOIL_PROBE':
        return 'soil-probe';
      case 'LEAF_WETNESS':
        return 'leaf-wetness';
      case 'WEATHER_STATION':
        return 'weather-station';
      default:
        return 'unknown';
    }
  }
}
