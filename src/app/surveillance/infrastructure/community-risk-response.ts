/**
 * @file community-risk-response.ts
 * @description API resource payload for GET /api/v1/community-risk?plotId&radiusKm.
 */

export interface NearbyRiskSignalResource {
  id?: string;
  title?: string;
  probableThreat?: string;
  severity?: string;
  distanceKm?: number;
}

export interface CommunityRiskResource {
  plotId?: number;
  plotName?: string;
  radiusKm?: number;
  signals?: NearbyRiskSignalResource[];
  preventiveRecommendations?: string[];
}
