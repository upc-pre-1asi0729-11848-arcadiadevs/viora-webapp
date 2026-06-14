import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Map as MapboxMap } from 'mapbox-gl';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MapboxService } from '../../shared/infrastructure/mapbox.service';
import { Plot } from '../domain/model/plot.entity';
import { AgronomicMapAdapter } from '../infrastructure/agronomic-map.adapter';

/** Optional map features; both default off so the compact dashboard widget is unaffected. */
export interface PlotMapOptions {
  /** Overlay the NDVI raster tiles on top of the satellite base. */
  imagery?: boolean;
  /** Reverse-geocode the map center and expose it through `locationLabel`. */
  location?: boolean;
}

interface MapboxGeocodingResponse {
  features: { place_name: string }[];
}

@Injectable()
export class PlotMapService implements OnDestroy {
  private readonly mapboxService = inject(MapboxService);
  private readonly http = inject(HttpClient);

  private map: MapboxMap | null = null;
  private adapter: AgronomicMapAdapter | null = null;
  private pendingPlot: Plot | null = null;
  private options: PlotMapOptions = {};
  private resizeTimeouts: ReturnType<typeof setTimeout>[] = [];

  /** Human-readable place name of the current map center (only when location is enabled). */
  readonly locationLabel = signal<string>('');

  private readonly centerChanges = new Subject<[number, number]>();
  private readonly locationSubscription: Subscription;

  constructor() {
    this.locationSubscription = this.centerChanges
      .pipe(
        debounceTime(700),
        distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
        switchMap((center) => this.reverseGeocode(center)),
      )
      .subscribe((label) => this.locationLabel.set(label));
  }

  init(
    container: HTMLElement | null | undefined,
    initialPlot: Plot | null = null,
    options: PlotMapOptions = {},
  ): void {
    if (!container) {
      return;
    }

    this.cleanup();

    this.pendingPlot = initialPlot;
    this.options = options;

    const center = initialPlot?.polygonCoordinates.at(0) ?? [0, 0];

    this.mapboxService
      .createMapInstance({
        container,
        zoom: 14,
        center,
      })
      .then((mapInstance) => {
        this.map = mapInstance;

        const handleMapReady = (): void => {
          this.adapter = new AgronomicMapAdapter(mapInstance);

          if (this.pendingPlot) {
            this.render(this.pendingPlot);
          }

          if (this.options.location) {
            mapInstance.on('moveend', () => this.emitCenter(mapInstance));
            this.emitCenter(mapInstance);
          }

          this.scheduleResize(mapInstance);
        };

        if (mapInstance.loaded()) {
          handleMapReady();
        } else {
          mapInstance.once('load', handleMapReady);
        }
      })
      .catch((error) => {
        console.error('[PlotMapService] Failed to initialize Mapbox.', error);
      });
  }

  render(plot: Plot | null | undefined): void {
    if (!plot) {
      return;
    }

    this.pendingPlot = plot;

    if (!this.adapter) {
      return;
    }

    this.adapter.renderPlotSurveillance(plot, { imagery: this.options.imagery });
  }

  resize(): void {
    this.map?.resize();
  }

  cleanup(): void {
    this.resizeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.resizeTimeouts = [];

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.adapter = null;
    this.pendingPlot = null;
    this.locationLabel.set('');
  }

  ngOnDestroy(): void {
    this.locationSubscription.unsubscribe();
    this.centerChanges.complete();
    this.cleanup();
  }

  private emitCenter(mapInstance: MapboxMap): void {
    const center = mapInstance.getCenter();
    this.centerChanges.next([center.lng, center.lat]);
  }

  private reverseGeocode(center: [number, number]) {
    const token = environment.mapbox.accessToken;

    if (!token) {
      return of('');
    }

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${center[0]},${center[1]}.json` +
      `?types=place,locality,region,country&limit=1&access_token=${token}`;

    return this.http.get<MapboxGeocodingResponse>(url).pipe(
      map((response) => response.features?.[0]?.place_name ?? ''),
      catchError(() => of('')),
    );
  }

  private scheduleResize(mapInstance: MapboxMap): void {
    [300, 800, 1600].forEach((delay) => {
      const timeoutId = setTimeout(() => {
        mapInstance.resize();
      }, delay);

      this.resizeTimeouts.push(timeoutId);
    });
  }
}
