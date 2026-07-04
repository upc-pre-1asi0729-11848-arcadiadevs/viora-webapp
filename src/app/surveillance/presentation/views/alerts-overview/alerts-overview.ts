import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';

import { SurveillanceStore } from '../../../application/surveillance.store';
import { Alert, AlertSeverity } from '../../../domain/model/alert.entity';
import {
  CommunityRiskMap,
  LngLat,
} from '../../components/community-risk-map/community-risk-map';

/** Action button configuration derived from an alert's type. */
interface AlertAction {
  label: string;
  route?: string;
  review?: boolean;
}

@Component({
  selector: 'app-alerts-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader, CommunityRiskMap, TranslatePipe],
  templateUrl: './alerts-overview.html',
  styleUrl: './alerts-overview.css',
})
export class AlertsOverviewView implements OnInit {
  protected readonly store = inject(SurveillanceStore);
  private readonly router = inject(Router);
  private readonly agronomicApi = inject(AgronomicApiService);

  /** The producer's plots, used as community-risk reference selector. */
  protected readonly plots = signal<Plot[]>([]);
  /** The plot whose surroundings the Community Risk section reflects. */
  protected readonly referencePlotId = signal<number | string | null>(null);
  /** Selected monitoring radius in kilometers. */
  protected readonly riskRadiusKm = signal<number>(10);
  protected readonly radiusOptions = [5, 10, 25];

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Alerts', labelKey: 'alertsPage.breadcrumb.alerts', disabled: true },
    { label: 'Overview', labelKey: 'alertsPage.breadcrumb.overview', disabled: true },
  ];

  protected readonly pageSize = 6;
  protected readonly searchTerm = signal<string>('');
  protected readonly currentPage = signal<number>(1);

  /** Alerts filtered by the search box (alert type or plot name). */
  protected readonly filteredAlerts = computed<Alert[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const alerts = this.store.alerts();

    if (!term) {
      return alerts;
    }

    return alerts.filter(
      (alert) =>
        alert.typeLabel.toLowerCase().includes(term) ||
        alert.plot.name.toLowerCase().includes(term) ||
        alert.plot.location.toLowerCase().includes(term),
    );
  });

  protected readonly totalPages = computed<number>(() =>
    Math.max(1, Math.ceil(this.filteredAlerts().length / this.pageSize)),
  );

  protected readonly pageNumbers = computed<number[]>(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  /** Alerts visible on the current page. */
  protected readonly pagedAlerts = computed<Alert[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;

    return this.filteredAlerts().slice(start, start + this.pageSize);
  });

  /** "Showing 1 to 6 of 9 alerts" caption. */
  protected readonly rangeLabel = computed<string>(() => {
    const total = this.filteredAlerts().length;

    if (total === 0) {
      return 'No alerts to show';
    }

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);

    return `Showing ${start} to ${end} of ${total} alerts`;
  });

  protected readonly isLoading = computed<boolean>(() => this.store.loading().alerts);

  /** Centroid ([lng, lat]) of the selected reference plot, for the map center. */
  protected readonly referenceCenter = computed<LngLat | null>(() => {
    const plotId = this.referencePlotId();
    const plot = this.plots().find((candidate) => String(candidate.id) === String(plotId));
    const points = plot?.polygonCoordinates ?? [];

    if (points.length === 0) {
      return null;
    }

    const sum = points.reduce(
      (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat] as LngLat,
      [0, 0] as LngLat,
    );

    return [sum[0] / points.length, sum[1] / points.length];
  });

  ngOnInit(): void {
    this.store.fetchAlerts(50);
    this.loadReferencePlots();
  }

  /**
   * Loads the producer's plots and points the Community Risk section at the
   * first one, so it reflects a real plot even when there are no alerts yet.
   */
  private loadReferencePlots(): void {
    this.agronomicApi
      .getPlots()
      .pipe(take(1))
      .subscribe((plots) => {
        this.plots.set(plots);

        const first = plots[0];
        if (first && first.id != null) {
          this.referencePlotId.set(first.id);
          this.store.loadCommunityRisk(first.id, this.riskRadiusKm());
        }
      });
  }

  /** Switches the Community Risk reference plot. */
  protected onSelectReferencePlot(plotId: number | string): void {
    this.referencePlotId.set(plotId);
    this.store.loadCommunityRisk(plotId, this.riskRadiusKm());
  }

  /** Changes the monitoring radius and reloads the community-risk snapshot. */
  protected onSelectRadius(radiusKm: number): void {
    this.riskRadiusKm.set(radiusKm);

    const plotId = this.referencePlotId();
    if (plotId != null) {
      this.store.loadCommunityRisk(plotId, radiusKm);
    }
  }

  protected refresh(): void {
    this.store.fetchAlerts(50);
  }

  /** Navigates to a workspace route from a button. */
  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  protected previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  /** Runs the contextual action attached to an alert row. */
  protected runAction(alert: Alert): void {
    const action = this.actionFor(alert);

    if (action.review && alert.id !== null) {
      this.store.markUnderReview(alert.id);
      return;
    }

    if (action.route) {
      this.router.navigate([action.route]);
    }
  }

  /** Whether the alert is still open (can be resolved/dismissed by the producer). */
  protected isOpenAlert(alert: Alert): boolean {
    return alert.status !== 'Resolved' && alert.status !== 'Dismissed';
  }

  /** Producer self-service: resolves the alert (threat handled without a specialist). */
  protected resolveAlert(alert: Alert): void {
    if (alert.id !== null) {
      this.store.resolveAlert(alert.id);
    }
  }

  /** Producer self-service: dismisses the alert (ruled out as a false alarm). */
  protected dismissAlert(alert: Alert): void {
    if (alert.id !== null) {
      this.store.dismissAlert(alert.id);
    }
  }

  /** Contextual action (label + behavior) for an alert based on its type. */
  protected actionFor(alert: Alert): AlertAction {
    switch (alert.type?.trim().toUpperCase()) {
      case 'PHENOLOGICAL_RISK':
        return { label: 'Open nutrition plan', route: '/agronomic/dynamic-nutrition' };
      case 'CHILL_DEFICIT':
      case 'CLIMATE_EXTREME':
        return { label: 'View climate detail', route: '/agronomic/plots' };
      case 'PEST_SYMPTOM':
      case 'XYLELLA_RELATED':
        return { label: 'Request expert', route: '/assistance/expert-assistance/request' };
      case 'COMMUNITY_PEST':
        return { label: 'Inspect plot', review: true };
      case 'LOW_NDVI':
        return { label: 'View plot overview', route: '/agronomic/plots' };
      case 'HYDRIC_STRESS':
      case 'WATER_STRESS':
        return { label: 'Review telemetry', route: '/agronomic/iot-devices' };
      default:
        return { label: 'View details', route: '/agronomic/plots' };
    }
  }

  /** CSS modifier for a severity pill. */
  protected severityClass(severity: AlertSeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  /** CSS modifier for a status pill. */
  protected statusClass(status: Alert['status']): string {
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
