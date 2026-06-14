import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../application/agronomic.store';
import { WeatherForecastDay } from '../../../domain/model/weather-summary.entity';

@Component({
  selector: 'app-weather-summary-card',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './weather-summary-card.html',
  styleUrl: './weather-summary-card.css'
})
export class WeatherSummaryCard {
  protected readonly store = inject(AgronomicStore);

  protected readonly weatherVisual = computed(() => {
    const condition = (this.store.weatherSummary()?.condition ?? '').trim().toLowerCase();
    const assetRoot = '/assets/icons/backgrounds';

    if (condition.includes('thunder') || condition.includes('storm')) {
      return `${assetRoot}/Thunderstorm.png`;
    }

    if (
      condition.includes('rain') ||
      condition.includes('drizzle') ||
      condition.includes('shower') ||
      condition.includes('snow')
    ) {
      return `${assetRoot}/rain.png`;
    }

    if (
      condition.includes('breezy') ||
      condition.includes('wind')
    ) {
      return `${assetRoot}/breezy.png`;
    }

    if (
      condition.includes('clear') ||
      condition.includes('sunny')
    ) {
      return `${assetRoot}/clear.png`;
    }

    return `${assetRoot}/party-cloudy.png`;
  });

  protected readonly todayForecast = computed<WeatherForecastDay | null>(() => {
    return this.store.weatherSummary()?.forecast3Days.at(0) ?? null;
  });

  protected readonly temperatureProgress = computed<number>(() => {
    const weather = this.store.weatherSummary();
    const forecast = this.todayForecast();

    if (!weather || !forecast || forecast.maxTemp <= forecast.minTemp) {
      return 0;
    }

    const progress = ((weather.currentTemp - forecast.minTemp) / (forecast.maxTemp - forecast.minTemp)) * 100;

    return Math.min(100, Math.max(0, Math.round(progress)));
  });

  protected heroBackgroundImage(): string {
    return `url("${this.weatherVisual()}")`;
  }
}
