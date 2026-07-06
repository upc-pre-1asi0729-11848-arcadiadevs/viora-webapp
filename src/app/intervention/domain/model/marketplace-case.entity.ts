/**
 * Read model for the specialist Intervention Marketplace (Overview): the inbox of
 * incoming producer cases routed to the signed-in specialist and still awaiting a
 * response, plus the headline counters.
 *
 * Domain-derived, backend-provided strings (problem, producer name, plot name,
 * location) are treated as data and shown verbatim — only chrome is translated.
 * Fields with no real source for a given case are `null` and the view renders an
 * empty state; case distance is intentionally absent (no specialist geolocation).
 */

/** Severity tier of the case's linked alert. */
export type CaseSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** A single incoming producer case awaiting the specialist's response. */
export interface MarketplaceCase {
  readonly id: number | string;
  readonly referenceCode: string;
  /** The signed-in specialist the case is routed to (proposal author). */
  readonly specialistId: number | null;
  readonly severity: CaseSeverity | null;
  readonly problem: string;
  readonly ndvi: number | null;
  readonly producerName: string;
  /** Producer's avatar URL; null when unset (view falls back to a monogram). */
  readonly producerPhotoUrl: string | null;
  /** Crop type (e.g. "Olive"); the view frames it as "<crop> production". */
  readonly productionType: string | null;
  readonly plotName: string;
  readonly location: string | null;
  readonly areaHectares: number | null;
  readonly plotCount: number | null;
  readonly createdAt: Date | null;
}

/** The full specialist marketplace read model. */
export interface SpecialistMarketplace {
  readonly newCasesCount: number;
  /** Null until the specialist has decided proposals (view shows an empty state). */
  readonly acceptanceRatePercent: number | null;
  readonly activeCasesCount: number;
  readonly cases: MarketplaceCase[];
  readonly updatedAt: Date | null;
}
