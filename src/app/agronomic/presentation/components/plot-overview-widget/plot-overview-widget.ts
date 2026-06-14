import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';
import { PlotMap } from '../plot-map/plot-map';

@Component({
  selector: 'app-plot-overview-widget',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    PlotMap,
    TranslatePipe
  ],
  templateUrl: './plot-overview-widget.html',
  styleUrl: './plot-overview-widget.css'
})
export class PlotOverviewWidget {
  protected readonly store = inject(AgronomicStore);

  protected readonly selectedPlot = computed(() => this.store.selectedPlot());
  protected readonly selectedRecord = computed(() => this.store.selectedPlotLatestRecord());
  protected readonly recommendation = computed(() => {
    const plot = this.selectedPlot();
    const record = this.selectedRecord();
    const ndviValue = record?.ndviIndex ?? plot?.currentImagery?.ndviMean ?? 0;

    if (!plot) {
      return 'plotOverview.recommendations.waiting';
    }

    if (plot.healthStatus === 'Critical' || plot.phenologicalRisk === 'High') {
      return 'plotOverview.recommendations.inspect';
    }

    if (
      plot.healthStatus === 'Under Review' ||
      plot.phenologicalRisk === 'Medium' ||
      record?.ndviTrend === 'down' ||
      ndviValue < 0.5
    ) {
      return 'plotOverview.recommendations.nutrition';
    }

    return 'plotOverview.recommendations.monitoring';
  });

  protected onPlotSelected(event: MatSelectChange): void {
    this.store.selectMapPlot(event.value);
  }

  protected ndviTrendIcon(): string {
    const trend = this.selectedRecord()?.ndviTrend ?? 'stable';

    if (trend === 'up') {
      return 'arrow_upward';
    }

    if (trend === 'down') {
      return 'arrow_downward';
    }

    return 'trending_flat';
  }
}
