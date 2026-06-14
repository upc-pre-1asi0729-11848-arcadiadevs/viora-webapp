import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicStore } from '../../../application/agronomic.store';
import {
  MyPlotOverviewItem,
  MyPlotsOverview,
} from '../../../domain/model/my-plots-overview.entity';
import { PlotHealthStatus } from '../../../domain/model/plot.entity';
import { PlotThumbnail } from '../../components/plot-thumbnail/plot-thumbnail';

interface PlotOverviewTab {
  id: string;
  labelKey: string;
  icon: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'app-my-plots-overview',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    TranslatePipe,
    DashboardHeader,
    PlotThumbnail,
  ],
  templateUrl: './my-plots-overview.html',
  styleUrl: './my-plots-overview.css',
})
export class MyPlotsOverviewView implements OnInit {
  protected readonly store = inject(AgronomicStore);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'My Plots', labelKey: 'sidebar.myPlots', disabled: true },
    { label: 'Overview', labelKey: 'myPlots.overview', disabled: true },
  ];

  protected readonly tabs: PlotOverviewTab[] = [
    { id: 'dashboard', labelKey: 'toolbar.dashboard', icon: 'grid_view', route: '/dashboard' },
    { id: 'plot-overview', labelKey: 'toolbar.plotOverview', icon: 'map', active: true },
    { id: 'weather', labelKey: 'toolbar.weather', icon: 'cloud', route: '/dashboard' },
  ];

  protected readonly overview = computed<MyPlotsOverview | null>(() =>
    this.store.myPlotsOverview(),
  );

  protected readonly plots = computed<MyPlotOverviewItem[]>(
    () => this.overview()?.plots ?? [],
  );

  protected readonly isLoading = computed<boolean>(() => this.store.loading().overview);

  protected readonly monitoredAreaLabel = computed<string>(() => {
    const hectares = this.overview()?.monitoredAreaHectares ?? 0;

    return `${hectares.toFixed(1)} ha`;
  });

  protected readonly climateLinkedLabel = computed<string>(() => {
    const overview = this.overview();

    if (!overview) {
      return '0 / 0';
    }

    return `${overview.climateLinkedPlotCount} / ${overview.registeredPlotCount}`;
  });

  protected readonly allClimateLinked = computed<boolean>(() => {
    const overview = this.overview();

    return (
      !!overview &&
      overview.registeredPlotCount > 0 &&
      overview.climateLinkedPlotCount >= overview.registeredPlotCount
    );
  });

  ngOnInit(): void {
    this.store.fetchMyPlotsOverview();
  }

  protected refresh(): void {
    this.store.fetchMyPlotsOverview();
  }

  /** Maps a normalized health status to a pill style modifier. */
  protected statusModifier(status: PlotHealthStatus): string {
    switch (status) {
      case 'Healthy':
        return 'is-healthy';
      case 'Critical':
        return 'is-critical';
      default:
        return 'is-review';
    }
  }

  /** Relative "N min ago" label for a plot's last update timestamp. */
  protected relativeTime(isoTimestamp: string): string {
    const timestamp = isoTimestamp ? Date.parse(isoTimestamp) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return '—';
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

    if (diffMinutes < 1) {
      return 'just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours} h ago`;
    }

    return `${Math.round(diffHours / 24)} d ago`;
  }
}
