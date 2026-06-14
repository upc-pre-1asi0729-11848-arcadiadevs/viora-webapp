import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';

@Component({
  selector: 'app-overall-plot-health-card',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, TranslatePipe],
  templateUrl: './overall-plot-health-card.html',
  styleUrl: './overall-plot-health-card.css',
})
export class OverallPlotHealthCard {
  protected readonly store = inject(AgronomicStore);

  /**
   * Maps a health status (display or backend form) to a pill color modifier so
   * the state reads at a glance: healthy = green, warning/review = secondary, critical = red.
   */
  protected statusClass(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'HEALTHY':
        return 'is-healthy';
      case 'HIGH':
      case 'CRITICAL':
        return 'is-critical';
      default:
        return 'is-review';
    }
  }
}
