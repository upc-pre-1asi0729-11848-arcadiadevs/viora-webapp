/**
 * @file plot-registration.assembler.ts
 * @description Maps POST /plots payloads between domain and API resources.
 */
import { PlotRegistration } from '../domain/model/plot-registration.entity';

import { PlotRegistrationResource } from './plot-registration-response';
import { normalizeMonitoringLink } from './status-normalizers';

export class PlotRegistrationAssembler {
  static toEntityFromResource(
    resource: PlotRegistrationResource | null | undefined,
  ): PlotRegistration {
    return new PlotRegistration({
      id: resource?.id ?? null,
      name: resource?.name ?? '',
      location: resource?.location ?? '',
      campaign: resource?.campaign ?? '',
      cropType: resource?.cropType ?? '',
      variety: resource?.variety ?? '',
      notes: resource?.notes ?? '',
      polygonCoordinates: resource?.polygonCoordinates ?? [],
      areaSizeHectares: resource?.areaSizeHectares ?? 0,
      state: resource?.state ?? '',
      climateMonitoring: normalizeMonitoringLink(resource?.climateMonitoring),
      satelliteNdvi: normalizeMonitoringLink(resource?.satelliteNdvi),
      iotDevices: normalizeMonitoringLink(resource?.iotDevices),
    });
  }
}
