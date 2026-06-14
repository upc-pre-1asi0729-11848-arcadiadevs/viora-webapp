import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';

import { environment } from '../../../../../environments/environment';
import { MapboxService } from '../../../../shared/infrastructure/mapbox.service';
import { PlotCoordinate } from '../../../domain/model/plot.entity';
import { polygonAreaHectares } from '../../../infrastructure/geo-area';

export interface BoundaryState {
  points: PlotCoordinate[];
  closed: boolean;
  areaHectares: number;
  addMode: boolean;
}

/** Geocoding suggestion shown in the place search dropdown. */
export interface PlaceSuggestion {
  label: string;
  center: PlotCoordinate;
}

interface MapboxGeocodingFeature {
  place_name: string;
  center: [number, number];
}

interface MapboxGeocodingResponse {
  features: MapboxGeocodingFeature[];
}

const LINE_SOURCE = 'plot-boundary-line';
const FILL_SOURCE = 'plot-boundary-fill';
const CLOSED_COLOR = '#2e4a3a';
const OPEN_COLOR = '#ff5c5c';

// Default view centered on Tacna, Perú (the producer's region).
const DEFAULT_CENTER: PlotCoordinate = [-70.2536, -18.0146];

/**
 * Interactive Mapbox component to draw a plot's boundary polygon. Map clicks add
 * vertices while the polygon is open and "add mode" is active. Parent components
 * drive the toolbar actions via the exposed methods and read live state through
 * the `boundaryChange` output.
 */
@Component({
  selector: 'app-plot-boundary-map',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './plot-boundary-map.html',
  styleUrl: './plot-boundary-map.css',
})
export class PlotBoundaryMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  private readonly mapContainer?: ElementRef<HTMLElement>;

  @Output() readonly boundaryChange = new EventEmitter<BoundaryState>();

  private readonly mapboxService = inject(MapboxService);
  private readonly http = inject(HttpClient);

  private map: MapboxMap | null = null;
  private ready = false;
  private points: PlotCoordinate[] = [];
  private closed = false;
  private addMode = true;
  private markers: Marker[] = [];

  // ----- Place search (Mapbox geocoding) -----
  protected readonly searchControl = new FormControl('');
  protected readonly suggestions = signal<PlaceSuggestion[]>([]);

  /** Mirror of `closed` for the status chip overlaid on the map. */
  protected readonly closedState = signal<boolean>(false);

  /** Human-readable place name of the current map center, shown below the map. */
  protected readonly locationLabel = signal<string>('');

  /** Emits the map center after each pan/zoom so we can reverse-geocode it. */
  private readonly centerChanges = new Subject<PlotCoordinate>();

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => this.geocode(query)),
      )
      .subscribe((results) => this.suggestions.set(results));

    // Reverse-geocode the center only after the user stops moving (debounced),
    // to keep Mapbox geocoding calls to a minimum.
    this.centerChanges
      .pipe(
        debounceTime(700),
        distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
        switchMap((center) => this.reverseGeocode(center)),
      )
      .subscribe((label) => this.locationLabel.set(label));
  }

  private reverseGeocode(center: PlotCoordinate) {
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

  protected displayPlace(place: PlaceSuggestion | string | null): string {
    return typeof place === 'string' ? place : (place?.label ?? '');
  }

  protected onPlaceSelected(event: MatAutocompleteSelectedEvent): void {
    const place = event.option.value as PlaceSuggestion;
    this.map?.flyTo({ center: place.center, zoom: 15, duration: 1500 });
  }

  private geocode(query: unknown) {
    // After an option is selected the control value becomes the PlaceSuggestion
    // object; coerce non-string values to '' so the stream never throws (which
    // would silently kill the subscription and stop further searches).
    const term = (typeof query === 'string' ? query : '').trim();

    if (term.length < 3 || !environment.mapbox.accessToken) {
      return of<PlaceSuggestion[]>([]);
    }

    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(term)}.json` +
      `?limit=5&access_token=${environment.mapbox.accessToken}`;

    return this.http.get<MapboxGeocodingResponse>(url).pipe(
      switchMap((response) =>
        of(
          (response.features ?? []).map((feature) => ({
            label: feature.place_name,
            center: [feature.center[0], feature.center[1]] as PlotCoordinate,
          })),
        ),
      ),
      catchError(() => of<PlaceSuggestion[]>([])),
    );
  }

  ngAfterViewInit(): void {
    const container = this.mapContainer?.nativeElement;

    if (!container) {
      return;
    }

    this.mapboxService
      .createMapInstance({
        container,
        center: DEFAULT_CENTER,
        zoom: 13,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
      })
      .then((mapInstance) => {
        this.map = mapInstance;

        const onReady = (): void => {
          this.setupLayers();
          this.ready = true;
          this.applyCursor();
          this.emitCenter(mapInstance);
          [200, 600, 1200].forEach((delay) =>
            setTimeout(() => mapInstance.resize(), delay),
          );
        };

        if (mapInstance.loaded()) {
          onReady();
        } else {
          mapInstance.once('load', onReady);
        }

        mapInstance.on('error', (event) => {
          console.error('[PlotBoundaryMap] Mapbox error.', event.error ?? event);
        });

        mapInstance.on('moveend', () => this.emitCenter(mapInstance));

        mapInstance.on('click', (event) => {
          if (this.closed || !this.addMode) {
            return;
          }

          this.points = [...this.points, [event.lngLat.lng, event.lngLat.lat]];
          this.refresh();
        });
      })
      .catch((error) => {
        console.error('[PlotBoundaryMap] Failed to initialize Mapbox.', error);
      });
  }

  ngOnDestroy(): void {
    this.clearMarkers();
    this.map?.remove();
    this.map = null;
  }

  // ----- Public API used by the wizard toolbar -----

  undo(): void {
    if (this.points.length === 0) {
      return;
    }

    this.points = this.points.slice(0, -1);
    this.closed = false;
    this.refresh();
  }

  clear(): void {
    this.points = [];
    this.closed = false;
    this.refresh();
  }

  close(): void {
    if (this.points.length < 3) {
      return;
    }

    this.closed = true;
    this.refresh();
  }

  toggleAddMode(): void {
    this.addMode = !this.addMode;
    this.applyCursor();
    this.emit();
  }

  // ----- Internal rendering -----

  private setupLayers(): void {
    if (!this.map) {
      return;
    }

    this.map.addSource(FILL_SOURCE, { type: 'geojson', data: this.emptyCollection() });
    this.map.addLayer({
      id: `${FILL_SOURCE}-layer`,
      type: 'fill',
      source: FILL_SOURCE,
      paint: { 'fill-color': CLOSED_COLOR, 'fill-opacity': 0.25 },
    });

    this.map.addSource(LINE_SOURCE, { type: 'geojson', data: this.emptyCollection() });
    this.map.addLayer({
      id: `${LINE_SOURCE}-layer`,
      type: 'line',
      source: LINE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': OPEN_COLOR, 'line-width': 2.5 },
    });
  }

  private refresh(): void {
    this.renderGeometry();
    this.renderMarkers();
    this.emit();
  }

  private renderGeometry(): void {
    if (!this.map || !this.ready) {
      return;
    }

    const lineLayer = `${LINE_SOURCE}-layer`;
    const color = this.closed ? CLOSED_COLOR : OPEN_COLOR;
    this.map.setPaintProperty(lineLayer, 'line-color', color);
    this.map.setPaintProperty(
      lineLayer,
      'line-dasharray',
      this.closed ? [1] : [2, 1.5],
    );

    const lineCoords = this.closed && this.points.length >= 3
      ? [...this.points, this.points[0]]
      : this.points;

    const lineSource = this.map.getSource(LINE_SOURCE) as mapboxgl.GeoJSONSource;
    lineSource.setData(
      lineCoords.length >= 2
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          }
        : this.emptyCollection(),
    );

    const fillSource = this.map.getSource(FILL_SOURCE) as mapboxgl.GeoJSONSource;
    fillSource.setData(
      this.closed && this.points.length >= 3
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[...this.points, this.points[0]]],
            },
          }
        : this.emptyCollection(),
    );
  }

  private renderMarkers(): void {
    if (!this.map) {
      return;
    }

    this.clearMarkers();

    const color = this.closed ? CLOSED_COLOR : OPEN_COLOR;

    this.points.forEach((point, index) => {
      const element = document.createElement('div');
      element.style.width = '14px';
      element.style.height = '14px';
      element.style.borderRadius = '50%';
      element.style.background = '#ffffff';
      element.style.border = `3px solid ${color}`;
      element.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.35)';
      element.style.cursor = 'grab';

      const marker = new mapboxgl.Marker({ element, draggable: true })
        .setLngLat(point)
        .addTo(this.map!);

      // Live-update the geometry while dragging; recompute area on release.
      marker.on('dragstart', () => (element.style.cursor = 'grabbing'));
      marker.on('drag', () => {
        const position = marker.getLngLat();
        this.points[index] = [position.lng, position.lat];
        this.renderGeometry();
      });
      marker.on('dragend', () => {
        element.style.cursor = 'grab';
        const position = marker.getLngLat();
        this.points[index] = [position.lng, position.lat];
        this.refresh();
      });

      this.markers.push(marker);
    });
  }

  /** Pushes the map center into the reverse-geocode pipeline. */
  private emitCenter(mapInstance: MapboxMap): void {
    const center = mapInstance.getCenter();
    this.centerChanges.next([center.lng, center.lat]);
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  }

  private applyCursor(): void {
    if (!this.map) {
      return;
    }

    this.map.getCanvas().style.cursor = this.addMode && !this.closed ? 'crosshair' : '';
  }

  private emit(): void {
    this.closedState.set(this.closed);
    this.boundaryChange.emit({
      points: [...this.points],
      closed: this.closed,
      areaHectares: this.points.length >= 3 ? polygonAreaHectares(this.points) : 0,
      addMode: this.addMode,
    });
  }

  private emptyCollection(): GeoJSON.FeatureCollection {
    return { type: 'FeatureCollection', features: [] };
  }
}
