import { Component, Input, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';

@Component({
  selector: 'app-ndvi-status-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, TranslatePipe],
  templateUrl: './ndvi-status-card.html',
  styleUrl: './ndvi-status-card.css'
})
export class NdviStatusCard {
  protected readonly store = inject(AgronomicStore);

  /** Enriched layout (extra NDVI delta footer) — Plot Overview only. */
  @Input() detailed = false;

  protected readonly ndviProgress = computed(() => {
    const ndvi = this.store.latestAgronomicRecord()?.ndviIndex ?? 0;
    return Math.round(ndvi * 100);
  });
}
