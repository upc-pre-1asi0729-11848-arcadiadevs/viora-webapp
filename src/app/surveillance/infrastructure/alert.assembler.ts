/**
 * @file alert.assembler.ts
 * @description Maps the real backend's Alert resources (UPPERCASE enum names)
 * into the surveillance domain entity.
 */
import {
  Alert,
  AlertSeverity,
  AlertSource,
  AlertStatus,
} from '../domain/model/alert.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { AlertResource } from './alerts-response';

export class AlertAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {AlertResource} resource - Raw alert summary payload.
   * @returns {Alert}
   */
  static toEntityFromResource(resource: AlertResource | null | undefined): Alert {
    return new Alert({
      id: resource?.id ?? null,
      type: resource?.type ?? '',
      description: resource?.description ?? '',
      severity: this.toSeverity(resource?.severity),
      date: resource?.date ?? '',
      status: this.toStatus(resource?.status),
      sources: (resource?.sources ?? [])
        .map((source) => this.toSource(source))
        .filter((source): source is AlertSource => source !== null),
      plotId: resource?.plotId ?? null,
      plot: {
        name: resource?.plot?.name ?? '',
        location: resource?.plot?.location ?? '',
        hectares: resource?.plot?.hectares ?? 0,
      },
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {AlertResource[]} resources - Array of raw alert summaries.
   * @returns {Alert[]}
   */
  static toEntitiesFromResources(resources: AlertResource[] = []): Alert[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }

  /** Backend AlertSeverity: LOW | MEDIUM | HIGH | CRITICAL. */
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

  /** Backend AlertStatus: ACTIVE | SUGGEST | UNDER_REVIEW | RESOLVED | DISMISSED. */
  private static toStatus(value: string | undefined): AlertStatus {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'ACTIVE':
        return 'Active';
      case 'SUGGEST':
        return 'Suggest';
      case 'UNDER_REVIEW':
        return 'Under review';
      case 'RESOLVED':
        return 'Resolved';
      case 'DISMISSED':
        return 'Dismissed';
      default:
        return 'Pending';
    }
  }

  /** Backend AlertSource: CLIMATE | MANUAL_REPORT | COMMUNITY | SATELLITE | IOT | SYSTEM. */
  private static toSource(value: string | undefined): AlertSource | null {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'CLIMATE':
        return 'Climate';
      case 'MANUAL_REPORT':
        return 'Manual report';
      case 'COMMUNITY':
        return 'Community';
      case 'SATELLITE':
        return 'Satellite';
      case 'IOT':
        return 'IoT';
      case 'SYSTEM':
        return 'System';
      default:
        return null;
    }
  }
}
