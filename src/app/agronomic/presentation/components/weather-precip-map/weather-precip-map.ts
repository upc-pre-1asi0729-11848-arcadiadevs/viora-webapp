import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';

import { environment } from '../../../../../environments/environment';
import { Plot, PlotCoordinate } from '../../../domain/model/plot.entity';

/** RainViewer free, key-less radar index. */
const RAINVIEWER_MAPS = 'https://api.rainviewer.com/public/weather-maps.json';
const RADAR_SOURCE = 'rainviewer-radar';
const RADAR_LAYER = 'rainviewer-radar-layer';

/** Map center fallback (Tacna, Perú) when a plot has no geometry. */
const DEFAULT_CENTER: PlotCoordinate = [-70.2536, -18.0146];

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerMaps {
  host: string;
  radar?: { past?: RainViewerFrame[]; nowcast?: RainViewerFrame[] };
}

/**
 * Small static map centered on the plot showing the latest live precipitation
 * radar from RainViewer (no API key). Radar coverage is global but uneven, so
 * when no frame is available the base map still shows the plot location and the
 * parent surfaces the numeric precipitation from the backend instead.
 */
@Component({
  selector: 'app-weather-precip-map',
  standalone: true,
  imports: [],
  templateUrl: './weather-precip-map.html',
  styleUrl: './weather-precip-map.css',
})
export class WeatherPrecipMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  private readonly mapContainer?: ElementRef<HTMLElement>;

  readonly plot = input<Plot | null>(null);

  private readonly http = inject(HttpClient);
  private map: MapboxMap | null = null;
  private marker: Marker | null = null;
  private observer?: ResizeObserver;

  /** True when neither Mapbox nor a radar frame could be shown. */
  protected readonly radarUnavailable = signal<boolean>(false);

  constructor() {
    // Re-center + move the marker when the selected plot changes (the Weather
    // page reuses this component across plots, so the map must follow).
    effect(() => {
      const center = this.centroid();

      if (this.map && this.marker) {
        this.marker.setLngLat(center);
        this.map.flyTo({ center, zoom: 6, duration: 600 });
      }
    });
  }

  private readonly centroid = computed<PlotCoordinate>(() => {
    const points = this.plot()?.polygonCoordinates ?? [];

    if (points.length === 0) {
      return DEFAULT_CENTER;
    }

    const sum = points.reduce(
      (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat] as PlotCoordinate,
      [0, 0] as PlotCoordinate,
    );

    return [sum[0] / points.length, sum[1] / points.length];
  });

  ngAfterViewInit(): void {
    const container = this.mapContainer?.nativeElement;

    if (!container || !environment.mapbox.accessToken) {
      this.radarUnavailable.set(true);
      return;
    }

    mapboxgl.accessToken = environment.mapbox.accessToken;

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: this.centroid(),
      zoom: 6,
      interactive: false,
      attributionControl: false,
    });

    this.map = map;
    this.marker = new mapboxgl.Marker({ color: '#2e4a3a' })
      .setLngLat(this.centroid())
      .addTo(map);

    map.on('error', () => this.radarUnavailable.set(true));
    map.on('load', () => this.addRadarLayer(map));

    // Mapbox doesn't detect layout-driven resizes (e.g. collapsing the sidebar),
    // which leaves an unrendered strip; resize the canvas when the box changes.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() =>
        requestAnimationFrame(() => this.map?.resize()),
      );
      this.observer.observe(container);
    }

    [200, 600, 1200].forEach((delay) => setTimeout(() => map.resize(), delay));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  private addRadarLayer(map: MapboxMap): void {
    this.http.get<RainViewerMaps>(RAINVIEWER_MAPS).subscribe({
      next: (maps) => {
        const latest = (maps.radar?.past ?? []).at(-1);

        if (!maps.host || !latest) {
          this.radarUnavailable.set(true);
          return;
        }

        // color 4 = The Weather Channel scheme, options 1_1 = smooth + snow.
        const tiles = `${maps.host}${latest.path}/256/{z}/{x}/{y}/4/1_1.png`;

        map.addSource(RADAR_SOURCE, { type: 'raster', tiles: [tiles], tileSize: 256 });
        map.addLayer({
          id: RADAR_LAYER,
          type: 'raster',
          source: RADAR_SOURCE,
          paint: { 'raster-opacity': 0.75 },
        });
      },
      error: () => this.radarUnavailable.set(true),
    });
  }
}
