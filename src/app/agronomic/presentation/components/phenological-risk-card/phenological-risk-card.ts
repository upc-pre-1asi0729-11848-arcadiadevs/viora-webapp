import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';
import { PhenologicalRiskLevel } from '../../../domain/model/plot.entity';

/**
 * KPI card showing the selected plot's phenological risk (chill-deficit risk to
 * flowering). The value rides on the Plot entity, merged season-aware from the
 * backend overview, so the card reflects the active plot on the Plot Overview page.
 */
@Component({
  selector: 'app-phenological-risk-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './phenological-risk-card.html',
  styleUrl: './phenological-risk-card.css',
})
export class PhenologicalRiskCard {
  protected readonly store = inject(AgronomicStore);

  protected readonly risk = computed<PhenologicalRiskLevel | null>(() => {
    const plot = this.store.selectedDashboardPlot() ?? this.store.selectedMapPlot();
    return plot?.phenologicalRisk ?? null;
  });
}
