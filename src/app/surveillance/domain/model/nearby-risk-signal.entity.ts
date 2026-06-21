/**
 * @file nearby-risk-signal.entity.ts
 * @description Domain models for the Community Risk section: anonymized nearby
 * signals detected around a plot within a monitoring radius. The backend does
 * not expose these yet, so they are sourced from a mock provider until a
 * community-diffusion endpoint exists.
 */
import { AlertSeverity } from './alert.entity';

/** A single anonymized community signal detected near a plot. */
export interface NearbyRiskSignal {
  id: string;
  title: string;
  /** Approximate distance from the reference plot, in kilometers. */
  distanceKm: number;
  severity: AlertSeverity;
  /** Probable threat behind the signal (e.g. "Xylella-related"). */
  probableThreat: string;
}

/** The Community Risk snapshot for a reference plot and monitoring radius. */
export interface CommunityRiskSnapshot {
  plotName: string;
  radiusKm: number;
  signals: NearbyRiskSignal[];
  preventiveRecommendations: string[];
}
