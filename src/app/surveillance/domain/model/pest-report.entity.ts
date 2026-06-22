/**
 * @file pest-report.entity.ts
 * @description Domain entity for a manual pest sighting report (symptom report history).
 */
import { AlertSeverity } from './alert.entity';

export type RiskZone = 'FULL_PLOT' | 'PARTIAL_PLOT' | 'EDGES';

/** Triage / inspection outcome of a report. */
export type PestReportResult = 'Alert confirmed' | 'Needs inspection' | 'Logged' | 'Ruled out';

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

  /** Triage outcome shown in the "Result" column. */
  get result(): PestReportResult {
    const status = this.status.trim().toUpperCase();

    if (this.alertConfirmed || status === 'CONFIRMED') {
      return 'Alert confirmed';
    }

    // NEEDS_INSPECTION is the current state; UNDER_REVIEW is the legacy pre-triage
    // state, surfaced the same way so older reports still read sensibly.
    if (status === 'NEEDS_INSPECTION' || status === 'UNDER_REVIEW') {
      return 'Needs inspection';
    }

    if (status === 'RULED_OUT') {
      return 'Ruled out';
    }

    return 'Logged';
  }

  /**
   * Whether the report is awaiting a field inspection and can therefore be
   * confirmed or ruled out by the grower.
   */
  get awaitsInspection(): boolean {
    return this.result === 'Needs inspection';
  }
}
