/**
 * @file plot-detail.assembler.ts
 * @description Maps GET /plots/{plotId}?view=detail resource to the domain entity.
 */
import { PlotDetail } from '../domain/model/plot-detail.entity';

import { PlotDetailResource } from './plot-detail-response';
import { normalizeMonitoringLink } from './status-normalizers';

export class PlotDetailAssembler {
  static toEntityFromResource(
    resource: PlotDetailResource | null | undefined,
  ): PlotDetail | null {
    if (!resource) {
      return null;
    }

    const links = resource.monitoringLinks ?? {};
    const iot = resource.iot ?? {};

    return new PlotDetail({
      id: resource.id ?? null,
      name: resource.name ?? '',
      location: resource.location ?? '',
      campaign: resource.campaign ?? '',
      cropType: resource.cropType ?? '',
      variety: resource.variety ?? '',
      notes: resource.notes ?? '',
      polygonCoordinates: resource.polygonCoordinates ?? [],
      areaSizeHectares: resource.areaSizeHectares ?? 0,
      boundaryPointCount: resource.boundaryPointCount ?? 0,
      boundaryStatus: resource.boundaryStatus ?? '',
      registeredAt: resource.registeredAt ?? '',
      lastConfigurationUpdateAt: resource.lastConfigurationUpdateAt ?? '',
      climateMonitoring: normalizeMonitoringLink(links.climateMonitoring),
      satelliteNdvi: normalizeMonitoringLink(links.satelliteNdvi),
      climateLastSyncAt: links.climateLastSyncAt ?? '',
      satelliteLastSyncAt: links.satelliteLastSyncAt ?? '',
      iotStatus: normalizeMonitoringLink(iot.status),
      linkedDeviceCount: iot.linkedDeviceCount ?? 0,
      onlineDeviceCount: iot.onlineDeviceCount ?? 0,
      iotLastActivityAt: iot.lastActivityAt ?? '',
      devices: (resource.devices ?? []).map((device) => ({
        id: device.id ?? null,
        name: device.name ?? '',
        status: device.status ?? '',
        lastActivityAt: device.lastActivityAt ?? '',
      })),
      activity: (resource.recentConfigurationActivity ?? []).map((item) => ({
        type: item.type ?? '',
        description: item.description ?? '',
        occurredAt: item.occurredAt ?? '',
      })),
    });
  }
}
