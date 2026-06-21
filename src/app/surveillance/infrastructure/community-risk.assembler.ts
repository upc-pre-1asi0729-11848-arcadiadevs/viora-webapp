/**
 * @file community-risk.assembler.ts
 * @description Maps the GET /community-risk resource into the domain snapshot,
 * normalizing the backend's UPPERCASE severity names.
 */
import { AlertSeverity } from '../domain/model/alert.entity';
import {
  CommunityRiskSnapshot,
  NearbyRiskSignal,
} from '../domain/model/nearby-risk-signal.entity';

import {
  CommunityRiskResource,
  NearbyRiskSignalResource,
} from './community-risk-response';

export class CommunityRiskAssembler {
  static toEntityFromResource(
    resource: CommunityRiskResource | null | undefined,
  ): CommunityRiskSnapshot | null {
    if (!resource) {
      return null;
    }

    return {
      plotName: resource.plotName ?? '',
      radiusKm: resource.radiusKm ?? 0,
      signals: (resource.signals ?? []).map((signal) => this.toSignal(signal)),
      preventiveRecommendations: resource.preventiveRecommendations ?? [],
    };
  }

  private static toSignal(resource: NearbyRiskSignalResource): NearbyRiskSignal {
    return {
      id: resource.id ?? '',
      title: resource.title ?? '',
      distanceKm: resource.distanceKm ?? 0,
      severity: this.toSeverity(resource.severity),
      probableThreat: resource.probableThreat ?? '',
    };
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
