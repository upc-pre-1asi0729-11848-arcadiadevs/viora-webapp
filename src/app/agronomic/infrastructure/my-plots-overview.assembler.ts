/**
 * @file my-plots-overview.assembler.ts
 * @description Maps the GET /plots?view=overview resource to the domain entity.
 */
import {
  MyPlotOverviewItem,
  MyPlotsOverview,
} from '../domain/model/my-plots-overview.entity';

import {
  MyPlotOverviewItemResource,
  MyPlotsOverviewResource,
} from './my-plots-overview-response';
import { normalizePhenologicalRisk, normalizePlotHealthStatus } from './status-normalizers';

export class MyPlotsOverviewAssembler {
  static toEntityFromResource(
    resource: MyPlotsOverviewResource | null | undefined,
  ): MyPlotsOverview {
    return new MyPlotsOverview({
      registeredPlotCount: resource?.registeredPlotCount ?? 0,
      monitoredAreaHectares: resource?.monitoredAreaHectares ?? 0,
      climateLinkedPlotCount: resource?.climateLinkedPlotCount ?? 0,
      onlineDeviceCount: resource?.onlineDeviceCount ?? 0,
      plots: (resource?.plots ?? []).map((plot) => this.toItem(plot)),
    });
  }

  private static toItem(resource: MyPlotOverviewItemResource): MyPlotOverviewItem {
    return new MyPlotOverviewItem({
      id: resource.id ?? null,
      name: resource.name ?? '',
      location: resource.location ?? '',
      areaSizeHectares: resource.areaSizeHectares ?? 0,
      polygonCoordinates: resource.polygonCoordinates ?? [],
      healthStatus: normalizePlotHealthStatus(resource.healthStatus),
      phenologicalRisk: normalizePhenologicalRisk(resource.phenologicalRisk),
      currentNdvi: resource.currentNdvi ?? 0,
      chillPortions: resource.chillPortions ?? 0,
      onlineDeviceCount: resource.onlineDeviceCount ?? 0,
      activeAlertCount: resource.activeAlertCount ?? 0,
      lastUpdatedAt: resource.lastUpdatedAt ?? '',
    });
  }
}
