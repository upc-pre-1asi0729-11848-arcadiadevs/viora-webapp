/**
 * @file alert.entity.ts
 * @description Domain entity representing a surveillance alert.
 */
export type AlertId = number | string | null;

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type AlertStatus =
  | 'Pending'
  | 'Active'
  | 'Suggest'
  | 'Under review'
  | 'In Progress'
  | 'Resolved'
  | 'Dismissed';

/** Origin of the signal that raised the alert (backend AlertSource). */
export type AlertSource =
  | 'Climate'
  | 'Manual report'
  | 'Community'
  | 'Satellite'
  | 'IoT'
  | 'System';

export interface AlertPlotInfo {
  name: string;
  location: string;
  hectares: number;
}

export interface AlertProperties {
  id?: AlertId;
  type?: string;
  description?: string;
  severity?: AlertSeverity;
  date?: string;
  status?: AlertStatus;
  sources?: AlertSource[];
  plotId?: number | null;
  reportId?: number | null;
  plot?: AlertPlotInfo;
}

/** Maps a backend ThreatType enum name to a producer-facing label. */
const THREAT_TYPE_LABELS: Record<string, string> = {
  PHENOLOGICAL_RISK: 'Phenological risk',
  CHILL_DEFICIT: 'Chill deficit warning',
  CLIMATE_EXTREME: 'Climate extreme warning',
  PEST_SYMPTOM: 'Pest symptom report',
  COMMUNITY_PEST: 'Community pest alert',
  LOW_NDVI: 'Low NDVI zone',
  HYDRIC_STRESS: 'Hydric stress warning',
  WATER_STRESS: 'Hydric stress warning',
  XYLELLA_RELATED: 'Xylella-related alert',
  OLIVE_FRUIT_FLY: 'Olive fruit fly',
  OLIVE_MOTH: 'Olive moth',
  PEACOCK_SPOT: 'Peacock spot',
  UNKNOWN: 'Agronomic alert',
};

export class Alert {
  readonly id: AlertId;
  readonly type: string;
  readonly description: string;
  readonly severity: AlertSeverity;
  readonly date: string;
  readonly status: AlertStatus;
  readonly sources: AlertSource[];
  readonly plotId: number | null;
  /** The symptom report that originated this alert (null for autonomous alerts). */
  readonly reportId: number | null;
  readonly plot: AlertPlotInfo;

  /**
   * @param {AlertProperties} params - Entity data.
   * @param {AlertId} [params.id] - Unique identifier.
   * @param {string} [params.type] - Alert type (backend ThreatType enum name).
   * @param {string} [params.description] - Detailed description of the alert.
   * @param {AlertSeverity} [params.severity] - Level of urgency.
   * @param {string} [params.date] - Date string for the alert.
   * @param {AlertStatus} [params.status] - Current status.
   * @param {AlertSource[]} [params.sources] - Signals that raised the alert.
   * @param {AlertPlotInfo} [params.plot] - Associated plot information.
   */
  constructor({
    id = null,
    type = '',
    description = '',
    severity = 'Low',
    date = '',
    status = 'Pending',
    sources = [],
    plotId = null,
    reportId = null,
    plot = {
      name: '',
      location: '',
      hectares: 0,
    },
  }: AlertProperties = {}) {
    this.id = id;
    this.type = type;
    this.description = description;
    this.severity = severity;
    this.date = date;
    this.status = status;
    this.sources = sources;
    this.plotId = plotId;
    this.reportId = reportId;
    this.plot = plot;
  }

  get requiresUrgentAction(): boolean {
    const isSevere = this.severity === 'Critical' || this.severity === 'High';
    const isOpen = this.status === 'Active' || this.status === 'Pending';

    return isSevere && isOpen;
  }

  /** Producer-facing label for the alert type (e.g. "Phenological risk"). */
  get typeLabel(): string {
    return THREAT_TYPE_LABELS[this.type?.trim().toUpperCase()] ?? (this.type || 'Agronomic alert');
  }

  /** Primary signal shown in the table's Source column. */
  get primarySource(): AlertSource | null {
    return this.sources.length > 0 ? this.sources[0] : null;
  }

  get dateValue(): Date | null {
    if (!this.date) {
      return null;
    }

    const parsedDate = new Date(this.date);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  get formattedDate(): string {
    const parsedDate = this.dateValue;

    if (!parsedDate) {
      return 'No date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
  }

  get plotSummaryLabel(): string {
    return `${this.plot.location} · ${this.plot.hectares} ha`;
  }

  get descriptionPreview(): string {
    if (this.description.length <= 34) {
      return this.description;
    }

    return `${this.description.slice(0, 34)}...`;
  }
}
