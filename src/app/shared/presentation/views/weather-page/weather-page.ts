import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../../agronomic/application/agronomic.store';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';
import {
  WeatherForecastDay,
  WeatherSummary,
} from '../../../../agronomic/domain/model/weather-summary.entity';
import { WeatherPrecipMap } from '../../../../agronomic/presentation/components/weather-precip-map/weather-precip-map';
import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../components/dashboard-header/dashboard-header';

const ICON_ROOT = '/assets/icons/weather';
const BACKGROUND_ROOT = '/assets/icons/backgrounds';

interface HourCell {
  label: string;
  status: string;
  temp: number;
}

interface DailyRow {
  label: string;
  status: string;
  min: number;
  max: number;
  leftPct: number;
  widthPct: number;
}

interface StatTile {
  labelKey: string;
  icon: string;
  value: string;
  tone?: 'risk' | 'warn';
}

interface ImpactBullet {
  key: string;
  params?: Record<string, unknown>;
}

interface AlertChip {
  /** Translation key for a derived alert, or a raw backend warning message. */
  key?: string;
  text?: string;
}

/**
 * Dedicated Weather subsection — an Apple-Weather-style detailed view for one
 * plot. The side list mirrors the producer's plots; the detail panel renders the
 * selected plot's current conditions, hourly + multi-day forecast, a live
 * precipitation radar, today's statistics, and derived agronomic impact/alerts.
 */
@Component({
  selector: 'app-weather-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, TranslatePipe, WeatherPrecipMap, DashboardHeader],
  templateUrl: './weather-page.html',
  styleUrl: './weather-page.css',
})
export class WeatherPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(AgronomicStore);

  protected readonly searchTerm = signal<string>('');
  protected readonly selectedPlotId = signal<string | null>(null);

  constructor() {
    // Load weather for every plot in the side list (concurrent, cache-first).
    effect(() => {
      const plots = this.store.plots();
      untracked(() =>
        plots.forEach((plot) => {
          if (plot.id != null) {
            this.store.ensurePlotWeather(plot.id);
          }
        }),
      );
    });

    // Load the selected plot's weather + monitoring summary (for chill stats).
    effect(() => {
      const id = this.selectedPlotId();
      if (!id) {
        return;
      }
      untracked(() => {
        this.store.ensurePlotWeather(id);
        this.store.ensurePlotSummary(id);
      });
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectedPlotId.set(params.get('plotId'));

      if (this.store.plots().length === 0) {
        this.store.fetchPlots();
      }
    });
  }

  // ----- Plot list -----

  protected readonly filteredPlots = computed<Plot[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const plots = this.store.plots();
    return term ? plots.filter((plot) => plot.name.toLowerCase().includes(term)) : plots;
  });

  protected readonly selectedPlot = computed<Plot | null>(() => {
    const id = this.selectedPlotId();
    return id ? (this.store.plots().find((plot) => String(plot.id) === id) ?? null) : null;
  });

  protected readonly selectedWeather = computed<WeatherSummary | null>(() => {
    const id = this.selectedPlotId();
    return id ? (this.store.plotWeatherCache()[id] ?? null) : null;
  });

  protected weatherFor(plotId: Plot['id']): WeatherSummary | null {
    return plotId != null ? (this.store.plotWeatherCache()[String(plotId)] ?? null) : null;
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected isSelected(plotId: Plot['id']): boolean {
    return plotId != null && String(plotId) === this.selectedPlotId();
  }

  protected selectPlot(plotId: Plot['id']): void {
    if (plotId != null) {
      this.router.navigate(['/dashboard/weather', plotId]);
    }
  }

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Dashboard', labelKey: 'breadcrumbs.dashboard', route: '/dashboard' },
    { label: 'Weather', labelKey: 'breadcrumbs.weather', disabled: true },
    { label: this.selectedPlot()?.name ?? '—', disabled: true },
  ]);

  protected updatedLabel(): string {
    const updatedAt = this.selectedWeather()?.updatedAtDate;

    if (!updatedAt) {
      return 'No sync yet';
    }

    const minutes = Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 60000));

    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
  }

  protected refresh(): void {
    const id = this.selectedPlotId();
    if (id) {
      this.store.reloadPlotWeather(id);
    }
  }

  // ----- Hero -----

  protected readonly today = computed<WeatherForecastDay | null>(
    () => this.selectedWeather()?.forecast3Days.at(0) ?? null,
  );

  protected readonly heroBackground = computed<string>(() => {
    const image = this.backgroundFor(this.selectedWeather()?.condition);

    // Apple-style scrim: a translucent dark gradient over the photo guarantees
    // legible white text regardless of how bright the background image is.
    return (
      'linear-gradient(180deg, rgba(16,34,55,0.42) 0%, rgba(16,34,55,0.5) 45%,' +
      ` rgba(16,34,55,0.62) 100%), url("${image}")`
    );
  });

  // ----- Hourly strip -----

  protected readonly hourlyCells = computed<HourCell[]>(() => {
    const hours = this.selectedWeather()?.hourly ?? [];
    return hours.slice(0, 6).map((hour, index) => ({
      label: this.hourLabel(hour.time, index),
      status: hour.status,
      temp: Math.round(hour.temp),
    }));
  });

  protected readonly hourlySummaryParams = computed(() => {
    const weather = this.selectedWeather();
    return {
      condition: (weather?.condition || '—').toLowerCase(),
      gust: weather?.windGustKmh ?? 0,
    };
  });

  // ----- Daily forecast -----

  protected readonly dailyRows = computed<DailyRow[]>(() => {
    const days = this.selectedWeather()?.forecast3Days ?? [];
    if (days.length === 0) {
      return [];
    }

    const globalMin = Math.min(...days.map((day) => day.minTemp));
    const globalMax = Math.max(...days.map((day) => day.maxTemp));
    const span = Math.max(1, globalMax - globalMin);

    return days.map((day, index) => ({
      label: this.dayLabel(day, index),
      status: day.status,
      min: Math.round(day.minTemp),
      max: Math.round(day.maxTemp),
      leftPct: ((day.minTemp - globalMin) / span) * 100,
      widthPct: Math.max(8, ((day.maxTemp - day.minTemp) / span) * 100),
    }));
  });

  // ----- Today statistics -----

  protected readonly chillGap = computed<number>(() => {
    const chill = this.store.plotSummaryCache()[this.selectedPlotId() ?? '']?.chillHourRecord;
    return chill ? Math.round(chill.accumulatedChillPortions - chill.threshold) : 0;
  });

  protected readonly statTiles = computed<StatTile[]>(() => {
    const weather = this.selectedWeather();
    const chill = this.store.plotSummaryCache()[this.selectedPlotId() ?? '']?.chillHourRecord;

    if (!weather) {
      return [];
    }

    const gap = this.chillGap();

    return [
      {
        labelKey: 'weatherPage.stats.anomaly',
        icon: 'device_thermostat',
        value: weather.temperatureAnomaly ? weather.anomalyLabel : '—',
      },
      {
        labelKey: 'weatherPage.stats.climateRisk',
        icon: 'shield',
        value: weather.climateRisk,
        tone: 'risk',
      },
      {
        labelKey: 'weatherPage.stats.windGusts',
        icon: 'air',
        value: `${weather.windGustKmh} km/h`,
      },
      {
        labelKey: 'weatherPage.stats.humidity',
        icon: 'water_drop',
        value: `${weather.humidity}%`,
      },
      {
        labelKey: 'weatherPage.stats.currentChill',
        icon: 'ac_unit',
        value: chill ? `${Math.round(chill.accumulatedChillPortions)} CP` : '—',
      },
      {
        labelKey: 'weatherPage.stats.targetChill',
        icon: 'target',
        value: chill ? `${Math.round(chill.threshold)} CP` : '—',
      },
      {
        labelKey: 'weatherPage.stats.gap',
        icon: 'trending_up',
        value: chill ? `${gap > 0 ? '+' : ''}${gap} CP` : '—',
      },
      {
        labelKey: 'weatherPage.stats.trend',
        icon: 'show_chart',
        value: gap < 0 ? 'Below range' : 'On track',
        tone: 'warn',
      },
    ];
  });

  // ----- Agronomic impact (derived) -----

  protected readonly impactBullets = computed<ImpactBullet[]>(() => {
    const plot = this.selectedPlot();
    const weather = this.selectedWeather();

    if (!plot || !weather) {
      return [];
    }

    const bullets: ImpactBullet[] = [];
    const stable = plot.healthStatus === 'Healthy' && weather.climateRisk === 'Low';

    bullets.push(
      stable
        ? { key: 'weatherPage.impact.stable', params: { name: plot.name } }
        : {
            key: 'weatherPage.impact.attention',
            params: { name: plot.name, risk: weather.climateRisk },
          },
    );

    const gap = this.chillGap();
    if (gap < 0) {
      bullets.push({ key: 'weatherPage.impact.chillBelow', params: { gap: Math.abs(gap) } });
    } else if (this.store.plotSummaryCache()[plot.id != null ? String(plot.id) : '']) {
      bullets.push({ key: 'weatherPage.impact.chillOnTarget' });
    }

    bullets.push({ key: 'weatherPage.impact.recommendation' });

    return bullets;
  });

  // ----- Weather alerts -----

  protected readonly alertChips = computed<AlertChip[]>(() => {
    const weather = this.selectedWeather();
    if (!weather) {
      return [];
    }

    if (weather.warnings.length > 0) {
      return weather.warnings.map((warning) => ({ text: warning.message || warning.type }));
    }

    // No backend warnings: derive from the plot's state so the card is useful.
    const chips: AlertChip[] = [];
    if (weather.climateRisk === 'High' || Math.abs(weather.temperatureAnomaly) >= 3) {
      chips.push({ key: 'weatherPage.alerts.anomaly' });
    }
    if (this.chillGap() < 0) {
      chips.push({ key: 'weatherPage.alerts.chill' });
    }
    if (weather.climateRisk === 'High') {
      chips.push({ key: 'weatherPage.alerts.risk' });
    }
    return chips;
  });

  // ----- Presentation helpers -----

  protected iconFor(status: string | undefined): string {
    const value = (status ?? '').toUpperCase();

    if (value.includes('STORM') || value.includes('THUNDER')) {
      return `${ICON_ROOT}/thunderstorm.png`;
    }
    if (value.includes('RAIN') || value.includes('DRIZZLE') || value.includes('SNOW')) {
      return `${ICON_ROOT}/light_rain.png`;
    }
    if (value.includes('SAND') || value.includes('DUST') || value.includes('WIND')) {
      return `${ICON_ROOT}/blowing_sand.png`;
    }
    if (value.includes('PARTLY')) {
      return `${ICON_ROOT}/sun_cloudy.png`;
    }
    if (value.includes('CLOUD')) {
      return `${ICON_ROOT}/cloud.png`;
    }
    if (value.includes('SUN') || value.includes('CLEAR')) {
      return `${ICON_ROOT}/sunny.png`;
    }
    return `${ICON_ROOT}/sun_cloudy.png`;
  }

  protected backgroundFor(condition: string | undefined): string {
    const value = (condition ?? '').toLowerCase();

    if (value.includes('storm') || value.includes('thunder')) {
      return `${BACKGROUND_ROOT}/Thunderstorm.png`;
    }
    if (value.includes('rain') || value.includes('drizzle') || value.includes('snow')) {
      return `${BACKGROUND_ROOT}/rain.png`;
    }
    if (value.includes('wind') || value.includes('breez')) {
      return `${BACKGROUND_ROOT}/breezy.png`;
    }
    if (value.includes('clear') || value.includes('sun')) {
      return `${BACKGROUND_ROOT}/clear.png`;
    }
    return `${BACKGROUND_ROOT}/party-cloudy.png`;
  }

  protected listBackground(plotId: Plot['id']): string {
    return `url("${this.backgroundFor(this.weatherFor(plotId)?.condition)}")`;
  }

  protected tempLabel(value: number | undefined): string {
    return value == null ? '—°' : `${Math.round(value)}°`;
  }

  private hourLabel(time: string, index: number): string {
    if (index === 0) {
      return 'Now';
    }
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date
      .toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      .replace(/\s/g, '');
  }

  private dayLabel(day: WeatherForecastDay, index: number): string {
    if (index === 0) {
      return 'Today';
    }
    const date = day.date ? new Date(day.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return day.dayLabel;
    }
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
}
