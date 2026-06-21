/**
 * @file pest-report.entity.ts
 * @description Domain entity for a manual pest sighting report (symptom report history).
 */
import { AlertSeverity } from './alert.entity';

export type RiskZone = 'FULL_PLOT' | 'PARTIAL_PLOT' | 'EDGES';

/** Outcome of a report's automatic biological-risk evaluation. */
export type PestReportResult = 'Alert confirmed' | 'Under review' | 'Archived';

export interface PestReportProperties {
  id?: number | null;
  plotId?: number | null;
  riskZone?: RiskZone;
  symptoms?: string[];
  observedSeverity?: AlertSeverity;
  probableThreat?: string;
  status?: string;
  alertConfirmed?: boolean;
}

export class PestReport {
  readonly id: number | null;
  readonly plotId: number | null;
  readonly riskZone: RiskZone;
  readonly symptoms: string[];
  readonly observedSeverity: AlertSeverity;
  readonly probableThreat: string;
  readonly status: string;
  readonly alertConfirmed: boolean;

  constructor({
    id = null,
    plotId = null,
    riskZone = 'FULL_PLOT',
    symptoms = [],
    observedSeverity = 'Low',
    probableThreat = '',
    status = '',
    alertConfirmed = false,
  }: PestReportProperties = {}) {
    this.id = id;
    this.plotId = plotId;
    this.riskZone = riskZone;
    this.symptoms = symptoms;
    this.observedSeverity = observedSeverity;
    this.probableThreat = probableThreat;
    this.status = status;
    this.alertConfirmed = alertConfirmed;
  }

  /** Human-facing report code, e.g. "SR-REP-004". */
  get code(): string {
    return `SR-REP-${String(this.id ?? 0).padStart(3, '0')}`;
  }

  /** Comma-separated symptom list for the table. */
  get symptomsLabel(): string {
    return this.symptoms.join(', ');
  }

  /** Outcome shown in the "Result" column. */
  get result(): PestReportResult {
    const status = this.status.trim().toUpperCase();

    if (this.alertConfirmed || status === 'CONFIRMED') {
      return 'Alert confirmed';
    }

    if (status === 'UNDER_REVIEW') {
      return 'Under review';
    }

    return 'Archived';
  }
}
