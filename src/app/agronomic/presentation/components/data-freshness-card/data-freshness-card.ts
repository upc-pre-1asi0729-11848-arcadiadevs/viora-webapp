import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';

/** A single freshness line: how long ago a data source was last refreshed. */
interface FreshnessRow {
  labelKey: string;
  amount: string;
  unitKey: string;
}

@Component({
  selector: 'app-data-freshness-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './data-freshness-card.html',
  styleUrl: './data-freshness-card.css',
})
export class DataFreshnessCard {
  protected readonly store = inject(AgronomicStore);

  protected readonly rows = computed<FreshnessRow[]>(() => {
    const plot = this.store.selectedMapPlot();
    const satelliteDate = plot?.currentImagery?.captureDateValue ?? null;
    const weatherDate = this.store.weatherSummary()?.updatedAtDate ?? null;
    const predictionDate =
      this.store.plotMonitoringSummary()?.updatedAtDate ??
      this.store.monitoringSummary()?.updatedAtDate ??
      null;

    return [
      this.toRow('dataFreshness.satellite', satelliteDate),
      this.toRow('dataFreshness.weatherSync', weatherDate),
      this.toRow('dataFreshness.prediction', predictionDate),
    ];
  });

  private toRow(labelKey: string, date: Date | null): FreshnessRow {
    const parts = this.relativeParts(date);

    return { labelKey, amount: parts.amount, unitKey: parts.unitKey };
  }

  /** Splits the elapsed time into a numeric amount and a translatable unit key. */
  private relativeParts(date: Date | null): { amount: string; unitKey: string } {
    if (!date) {
      return { amount: '—', unitKey: '' };
    }

    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

    if (minutes < 1) {
      return { amount: '', unitKey: 'dataFreshness.units.justNow' };
    }

    if (minutes < 60) {
      return this.part(minutes, 'dataFreshness.units.minuteAgo', 'dataFreshness.units.minutesAgo');
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return this.part(hours, 'dataFreshness.units.hourAgo', 'dataFreshness.units.hoursAgo');
    }

    const days = Math.round(hours / 24);

    return this.part(days, 'dataFreshness.units.dayAgo', 'dataFreshness.units.daysAgo');
  }

  private part(
    value: number,
    singularKey: string,
    pluralKey: string,
  ): { amount: string; unitKey: string } {
    return { amount: String(value), unitKey: value === 1 ? singularKey : pluralKey };
  }
}
