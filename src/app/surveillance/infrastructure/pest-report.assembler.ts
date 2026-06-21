/**
 * @file pest-report.assembler.ts
 * @description Maps the backend's PestSightingReportResource into the domain entity.
 */
import { AlertSeverity } from '../domain/model/alert.entity';
import { PestReport, RiskZone } from '../domain/model/pest-report.entity';
import { PestSightingReportResource } from './pest-sighting-report-response';

export class PestReportAssembler {
  static toEntityFromResource(resource: PestSightingReportResource | null | undefined): PestReport {
    return new PestReport({
      id: resource?.id ?? null,
      plotId: resource?.plotId ?? null,
      riskZone: this.toRiskZone(resource?.riskZone),
      symptoms: resource?.symptoms ?? [],
      observedSeverity: this.toSeverity(resource?.observedSeverity),
      probableThreat: resource?.probableThreat ?? '',
      status: resource?.status ?? '',
      alertConfirmed: resource?.alertConfirmed ?? false,
    });
  }

  static toEntitiesFromResources(resources: PestSightingReportResource[] = []): PestReport[] {
    return resources.map((resource) => this.toEntityFromResource(resource));
  }

  private static toRiskZone(value: string | undefined): RiskZone {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'EDGES':
        return 'EDGES';
      case 'PARTIAL_PLOT':
        return 'PARTIAL_PLOT';
      default:
        return 'FULL_PLOT';
    }
  }

  private static toSeverity(value: string | undefined): AlertSeverity {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'CRITICAL':
        return 'Critical';
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }
}
