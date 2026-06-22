/**
 * Application service store for the `Surveillance` bounded context.
 * Coordinates fetching alerts from the real Viora Platform backend, derives the
 * Alerts/Overview KPI aggregations, and exposes the (mocked) Community Risk
 * snapshot until a community-diffusion endpoint exists.
 *
 * @module SurveillanceStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { SurveillanceApiService } from '../infrastructure/surveillance-api.service';

import { Alert } from '../domain/model/alert.entity';
import { CommunityRiskSnapshot, NearbyRiskSignal } from '../domain/model/nearby-risk-signal.entity';
import { PestReport } from '../domain/model/pest-report.entity';
import { SymptomResource } from '../infrastructure/symptom-response';
import {
  CreatePestSightingReportRequest,
  PestReportReviewOutcome,
} from '../infrastructure/pest-sighting-report-response';

/** Empty snapshot shown until the real community-risk endpoint responds. */
const EMPTY_COMMUNITY_RISK: CommunityRiskSnapshot = {
  plotName: '',
  radiusKm: 5,
  signals: [],
  preventiveRecommendations: [],
};

export interface SurveillanceLoadingState {
  alerts: boolean;
  reports: boolean;
  submitting: boolean;
}

/** Statuses that count as still-open (not closed by resolution/dismissal). */
const OPEN_STATUSES = new Set<Alert['status']>([
  'Pending',
  'Active',
  'Suggest',
  'Under review',
  'In Progress',
]);

/** Statuses that still have a pending recommended action for the producer. */
const ACTIONABLE_STATUSES = new Set<Alert['status']>(['Active', 'Suggest', 'Pending']);

@Injectable({
  providedIn: 'root',
})
export class SurveillanceStore {
  private readonly surveillanceApi = inject(SurveillanceApiService);

  /** List of surveillance alerts (newest first). */
  readonly alerts = signal<Alert[]>([]);
  /** Currently selected alert identifier. */
  readonly selectedAlertId = signal<number | string | null>(null);
  /** Whether alerts have been loaded at least once. */
  readonly alertsLoaded = signal<boolean>(false);
  /** Timestamp of the last successful alerts sync. */
  readonly lastSyncedAt = signal<number | null>(null);
  /** Errors encountered during API operations. */
  readonly errors = signal<unknown[]>([]);

  readonly loading = signal<SurveillanceLoadingState>({
    alerts: false,
    reports: false,
    submitting: false,
  });

  /** Symptom report history (newest first). */
  readonly pestReports = signal<PestReport[]>([]);
  /** Symptom catalog for the report form. */
  readonly symptoms = signal<SymptomResource[]>([]);

  /** Community Risk snapshot from the real backend (empty until loaded). */
  readonly communityRisk = signal<CommunityRiskSnapshot>(EMPTY_COMMUNITY_RISK);
  /** Identifier of the focused nearby risk signal. */
  readonly selectedSignalId = signal<string | null>(null);

  /** Most recent alerts (top 3), used by the dashboard card. */
  readonly recentAlerts = computed<Alert[]>(() => this.alerts().slice(0, 3));

  /** Alerts requiring urgent action. */
  readonly urgentAlerts = computed<Alert[]>(() =>
    this.alerts().filter((alert) => alert.requiresUrgentAction),
  );

  readonly selectedAlert = computed<Alert | null>(() => {
    const selectedId = this.selectedAlertId();

    if (selectedId === null) {
      return null;
    }

    return this.alerts().find((alert) => String(alert.id) === String(selectedId)) ?? null;
  });

  readonly hasAlerts = computed<boolean>(() => this.alerts().length > 0);
  readonly hasErrors = computed<boolean>(() => this.errors().length > 0);

  /** Open alerts (the "Active Alerts" KPI). */
  readonly openAlerts = computed<Alert[]>(() =>
    this.alerts().filter((alert) => OPEN_STATUSES.has(alert.status)),
  );

  readonly activeAlertsCount = computed<number>(() => this.openAlerts().length);

  readonly highPriorityCount = computed<number>(
    () => this.openAlerts().filter((alert) => alert.severity === 'High').length,
  );

  readonly criticalCount = computed<number>(
    () => this.openAlerts().filter((alert) => alert.severity === 'Critical').length,
  );

  /** Distinct plot names with at least one open alert. */
  readonly affectedPlotNames = computed<string[]>(() => {
    const names = this.openAlerts()
      .map((alert) => alert.plot.name)
      .filter((name) => name.length > 0);

    return [...new Set(names)];
  });

  readonly affectedPlotCount = computed<number>(() => this.affectedPlotNames().length);

  /** Alerts that still expose a pending recommended action. */
  readonly recommendedActionsCount = computed<number>(
    () => this.alerts().filter((alert) => ACTIONABLE_STATUSES.has(alert.status)).length,
  );

  /** The focused nearby risk signal (defaults to the highest-severity one). */
  readonly selectedSignal = computed<NearbyRiskSignal | null>(() => {
    const signals = this.communityRisk().signals;

    if (signals.length === 0) {
      return null;
    }

    const selectedId = this.selectedSignalId();
    const focused = selectedId
      ? signals.find((signal) => signal.id === selectedId)
      : undefined;

    if (focused) {
      return focused;
    }

    return [...signals].sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity))[0];
  });

  /** Relative "N min ago" label for the last sync. */
  readonly lastSyncLabel = computed<string>(() => {
    const syncedAt = this.lastSyncedAt();

    if (!syncedAt) {
      return 'No sync yet';
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - syncedAt) / 60000));

    if (diffMinutes < 1) {
      return 'Updated just now';
    }

    if (diffMinutes < 60) {
      return `Updated ${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    return `Updated ${diffHours} h ago`;
  });

  // ---- Pest Surveillance derivations ----

  /** Reports whose evaluation confirmed an alert. */
  readonly confirmedReports = computed<PestReport[]>(() =>
    this.pestReports().filter((report) => report.result === 'Alert confirmed'),
  );

  /** Community exposure: number of anonymized nearby signals. */
  readonly communityExposureCount = computed<number>(() => this.communityRisk().signals.length);

  /** Probable threat label for the Pest Surveillance KPI / risk panel. */
  readonly probableThreatLabel = computed<string>(() => {
    const signals = this.communityRisk().signals;

    if (signals.length > 0) {
      return [...signals].sort(
        (a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity),
      )[0].probableThreat;
    }

    const confirmed = this.confirmedReports();
    return confirmed.length > 0 ? this.threatLabel(confirmed[0].probableThreat) : '—';
  });

  /**
   * Heuristic risk confidence (0–100) derived transparently from the available
   * evidence (confirmed reports + nearby signals + presence of severe ones).
   * Not a model output — a UI aggregate until a scoring endpoint exists.
   */
  readonly riskConfidence = computed<number>(() => {
    const confirmed = this.confirmedReports().length;
    const community = this.communityRisk().signals.length;
    const hasSevere =
      this.communityRisk().signals.some((s) => s.severity === 'High' || s.severity === 'Critical') ||
      this.confirmedReports().some(
        (r) => r.observedSeverity === 'High' || r.observedSeverity === 'Critical',
      );

    if (confirmed === 0 && community === 0) {
      return 0;
    }

    return Math.min(95, 35 + confirmed * 15 + community * 6 + (hasSevere ? 12 : 0));
  });

  /**
   * Fetches the recent alerts feed (top N), used by the dashboard card.
   * @param {number} limit
   */
  fetchRecentAlerts(limit = 3): void {
    this.loadAlerts(limit);
  }

  /**
   * Fetches the full working set of alerts for the Alerts/Overview page.
   * @param {number} limit
   */
  fetchAlerts(limit = 50): void {
    this.loadAlerts(limit);
  }

  /**
   * Marks an alert as under review and reflects the change locally on success.
   * @param {number|string} id
   */
  markUnderReview(id: number | string): void {
    this.surveillanceApi
      .markAlertUnderReview(id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.alerts.update((alerts) =>
            alerts.map((alert) =>
              String(alert.id) === String(id)
                ? new Alert({ ...alert, status: 'Under review' })
                : alert,
            ),
          );
        },
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Loads the real community-risk snapshot for a plot from the backend.
   * @param {number|string} plotId
   * @param {number} radiusKm
   */
  loadCommunityRisk(plotId: number | string, radiusKm = 5): void {
    this.surveillanceApi
      .getCommunityRisk(plotId, radiusKm)
      .pipe(take(1))
      .subscribe({
        next: (snapshot) => {
          this.communityRisk.set(snapshot ?? EMPTY_COMMUNITY_RISK);
          this.selectedSignalId.set(null);
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Loads the producer's symptom report history. */
  loadPestReports(): void {
    this.setLoading('reports', true);

    this.surveillanceApi
      .getPestReports()
      .pipe(
        take(1),
        finalize(() => this.setLoading('reports', false)),
      )
      .subscribe({
        next: (reports) => this.pestReports.set(reports),
        error: (error) => this.registerError(error),
      });
  }

  /** Loads the symptom catalog used by the report form. */
  loadSymptoms(): void {
    this.surveillanceApi
      .getSymptomDictionary()
      .pipe(take(1))
      .subscribe({
        next: (symptoms) => this.symptoms.set(symptoms),
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Submits a manual pest sighting report. On success, refreshes the report
   * history and alerts (a confirmed report may have created an alert).
   * @param request the report payload (userId is injected by the API service)
   * @param onDone optional callback with the outcome
   */
  submitReport(
    request: Omit<CreatePestSightingReportRequest, 'reporterUserId'>,
    onDone?: (success: boolean) => void,
  ): void {
    this.setLoading('submitting', true);

    this.surveillanceApi
      .createPestReport(request)
      .pipe(
        take(1),
        finalize(() => this.setLoading('submitting', false)),
      )
      .subscribe({
        next: () => {
          this.loadPestReports();
          this.fetchAlerts(50);
          onDone?.(true);
        },
        error: (error) => {
          this.registerError(error);
          onDone?.(false);
        },
      });
  }

  /**
   * Resolves a report after a field inspection (confirm or rule out). On success,
   * refreshes the report history and alerts (a confirmation raises a new alert).
   * @param reportId The report to resolve.
   * @param outcome CONFIRMED or RULED_OUT.
   * @param onDone Optional callback with the success flag.
   */
  reviewReport(
    reportId: number | string,
    outcome: PestReportReviewOutcome,
    onDone?: (success: boolean) => void,
  ): void {
    this.setLoading('submitting', true);

    this.surveillanceApi
      .reviewPestReport(reportId, outcome)
      .pipe(
        take(1),
        finalize(() => this.setLoading('submitting', false)),
      )
      .subscribe({
        next: () => {
          this.loadPestReports();
          this.fetchAlerts(50);
          onDone?.(true);
        },
        error: (error) => {
          this.registerError(error);
          onDone?.(false);
        },
      });
  }

  selectAlert(id: number | string | null): void {
    this.selectedAlertId.set(id);
  }

  selectSignal(id: string | null): void {
    this.selectedSignalId.set(id);
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  private loadAlerts(limit: number): void {
    this.setLoading('alerts', true);

    this.surveillanceApi
      .getAlerts(limit)
      .pipe(
        take(1),
        finalize(() => this.setLoading('alerts', false)),
      )
      .subscribe({
        next: (alerts) => {
          this.alerts.set(alerts);
          this.alertsLoaded.set(true);
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => this.registerError(error),
      });
  }

  /** Maps a backend ThreatType enum name to a producer-facing label. */
  private threatLabel(type: string): string {
    switch ((type ?? '').trim().toUpperCase()) {
      case 'XYLELLA_RELATED':
        return 'Xylella-related';
      case 'OLIVE_FRUIT_FLY':
        return 'olive fruit fly';
      case 'OLIVE_MOTH':
        return 'olive moth';
      case 'PEACOCK_SPOT':
        return 'peacock spot';
      case 'PHENOLOGICAL_RISK':
        return 'phenological imbalance';
      case 'LOW_NDVI':
        return 'low-vigor cluster';
      case 'HYDRIC_STRESS':
      case 'WATER_STRESS':
        return 'hydric stress';
      case 'CHILL_DEFICIT':
      case 'CLIMATE_EXTREME':
        return 'climate stress';
      default:
        return 'pest symptom';
    }
  }

  private severityWeight(severity: Alert['severity']): number {
    switch (severity) {
      case 'Critical':
        return 4;
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      default:
        return 1;
    }
  }

  private setLoading(key: keyof SurveillanceLoadingState, value: boolean): void {
    this.loading.update((state) => ({
      ...state,
      [key]: value,
    }));
  }

  private registerError(error: unknown): void {
    this.errors.update((errors) => [...errors, error]);
  }
}
