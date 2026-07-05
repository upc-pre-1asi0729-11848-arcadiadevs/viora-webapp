import { Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SpecialistDashboardStore } from '../../../../intervention/application/specialist-dashboard.store';
import { IncomingRequest } from '../../../../intervention/domain/model/specialist-dashboard.entity';
import { DashboardBreadcrumbItem } from '../../components/dashboard-header/dashboard-header';
import { DashboardHeader } from '../../components/dashboard-header/dashboard-header';

/** Geometry of the inline performance sparkline (SVG user units). */
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 260;
const CHART_PADDING_Y = 24;

@Component({
  selector: 'app-specialist-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './specialist-dashboard.html',
  styleUrl: './specialist-dashboard.css',
})
export class SpecialistDashboard implements OnInit {
  protected readonly store = inject(SpecialistDashboardStore);

  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;

  ngOnInit(): void {
    this.store.load();
  }

  protected refresh(): void {
    this.store.refresh();
  }

  protected setPerformanceView(view: 'monthly' | 'annual'): void {
    this.store.setPerformanceView(view);
  }

  protected verify(request: IncomingRequest): void {
    this.store.verify(request);
  }

  protected decline(request: IncomingRequest): void {
    this.store.decline(request);
  }

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Dashboard', labelKey: 'breadcrumbs.dashboard', route: '/dashboard' },
    { label: 'Overview', labelKey: 'breadcrumbs.overview', disabled: true },
  ];

  /** Signed delta for the Acceptance Rate KPI (e.g. "+2.4%"). */
  protected readonly acceptanceDeltaLabel = computed<string>(() => {
    const delta = this.store.kpis()?.acceptanceRateDeltaPercent ?? 0;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta}%`;
  });

  /** "New" badge count for the incoming-requests card. */
  protected readonly incomingCount = computed<number>(() => this.store.incomingRequests().length);

  /** Polyline points ("x,y x,y …") for the accepted-cases sparkline. */
  protected readonly chartPolyline = computed<string>(() => {
    const series = this.store.performanceSeries();
    if (series.length === 0) {
      return '';
    }
    return series.map((point, index) => `${this.pointX(index, series.length)},${this.pointY(point.value)}`).join(' ');
  });

  /** Closed area path under the sparkline, for the soft gradient fill. */
  protected readonly chartArea = computed<string>(() => {
    const series = this.store.performanceSeries();
    if (series.length === 0) {
      return '';
    }
    const line = series
      .map((point, index) => `L ${this.pointX(index, series.length)} ${this.pointY(point.value)}`)
      .join(' ');
    const lastX = this.pointX(series.length - 1, series.length);
    const firstX = this.pointX(0, series.length);
    return `M ${firstX} ${CHART_HEIGHT} ${line} L ${lastX} ${CHART_HEIGHT} Z`;
  });

  /** Evenly-thinned axis labels (mockup shows ~5 across the width). */
  protected readonly chartLabels = computed<string[]>(() => {
    const series = this.store.performanceSeries();
    if (series.length <= 5) {
      return series.map((point) => point.label);
    }
    const step = (series.length - 1) / 4;
    return Array.from({ length: 5 }, (_, i) => series[Math.round(i * step)]?.label ?? '');
  });

  protected readonly updatedAgoLabel = computed<string>(() => {
    const updatedAt = this.store.updatedAt();
    if (!updatedAt) {
      return 'No sync yet';
    }

    const diffInMinutes = Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 60000));
    if (diffInMinutes < 1) {
      return 'just now';
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }
    const diffInHours = Math.round(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} h ago`;
    }
    return `${Math.round(diffInHours / 24)} days ago`;
  });

  private pointX(index: number, count: number): number {
    if (count <= 1) {
      return 0;
    }
    return (index / (count - 1)) * CHART_WIDTH;
  }

  private pointY(value: number): number {
    const max = Math.max(1, ...this.store.performanceSeries().map((point) => point.value));
    const usable = CHART_HEIGHT - CHART_PADDING_Y * 2;
    return CHART_PADDING_Y + (usable - (value / max) * usable);
  }
}
