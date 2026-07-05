/**
 * Read model for the Specialist segment dashboard (Overview). Aggregates the
 * signed-in specialist's headline KPIs, the zonal risk radar, their incoming
 * producer requests, and the accepted-cases performance series.
 *
 * Domain-derived, backend-provided strings (problem, plot/grower labels, zonal
 * titles) are treated as data and shown verbatim — only chrome is translated.
 */

/** Severity tier for a zonal prospecting radar entry. */
export type ZonalRiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

/** Phytosanitary efficiency qualitative status (drives the KPI pill). */
export type PhytosanitaryStatus = 'optimal' | 'watch' | 'critical';

/**
 * Headline KPI block (Resolved · Acceptance · Phytosanitary efficiency).
 * Nullable metrics have no value yet for the signed-in specialist: the
 * acceptance rate/delta are null until they have decided proposals, and the
 * phytosanitary efficiency is null until an intervention-outcome source exists.
 */
export interface SpecialistKpis {
  readonly resolvedInterventions: number;
  readonly acceptanceRatePercent: number | null;
  readonly acceptanceRateDeltaPercent: number | null;
  readonly phytosanitaryEfficiencyPercent: number | null;
  readonly phytosanitaryStatus: PhytosanitaryStatus | null;
}

/** A single entry in the "Zonal prospecting radar" list. */
export interface ZonalRiskItem {
  readonly id: number | string;
  readonly severity: ZonalRiskSeverity;
  readonly title: string;
  readonly distanceKm: number;
  readonly sector: string;
}

/** An incoming producer request awaiting the specialist's verify/decline. */
export interface IncomingRequest {
  readonly id: number | string;
  readonly referenceCode: string;
  readonly plotLabel: string;
  readonly growerLabel: string;
  readonly problem: string;
  readonly createdAt: Date | null;
}

/** A point in the accepted-cases performance series (monthly or annual). */
export interface PerformancePoint {
  /** Short axis label already resolved for display (e.g. "ENE", "2024"). */
  readonly label: string;
  readonly value: number;
}

/** The full specialist dashboard read model. */
export interface SpecialistDashboard {
  readonly kpis: SpecialistKpis;
  readonly zonalRisks: ZonalRiskItem[];
  readonly incomingRequests: IncomingRequest[];
  readonly performanceMonthly: PerformancePoint[];
  readonly performanceAnnual: PerformancePoint[];
  readonly updatedAt: Date | null;
}
