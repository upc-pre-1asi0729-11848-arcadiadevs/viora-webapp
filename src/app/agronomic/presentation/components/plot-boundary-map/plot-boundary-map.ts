import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';

import { MapboxService } from '../../../../shared/infrastructure/mapbox.service';
import { PlotCoordinate } from '../../../domain/model/plot.entity';
import { polygonAreaHectares } from '../../../infrastructure/geo-area';

export interface BoundaryState {
  points: PlotCoordinate[];
  closed: boolean;
  areaHectares: number;
  addMode: boolean;
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
  imports: [],
  templateUrl: './plot-boundary-map.html',
  styleUrl: './plot-boundary-map.css',
})
export class PlotBoundaryMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  private readonly mapContainer?: ElementRef<HTMLElement>;

  @Output() readonly boundaryChange = new EventEmitter<BoundaryState>();

  private readonly mapboxService = inject(MapboxService);

  private map: MapboxMap | null = null;
  private ready = false;
  private points: PlotCoordinate[] = [];
  private closed = false;
  private addMode = true;
  private markers: Marker[] = [];

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

    this.points.forEach((point) => {
      const element = document.createElement('div');
      element.style.width = '14px';
      element.style.height = '14px';
      element.style.borderRadius = '50%';
      element.style.background = '#ffffff';
      element.style.border = `3px solid ${color}`;
      element.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.35)';

      const marker = new mapboxgl.Marker({ element }).setLngLat(point).addTo(this.map!);
      this.markers.push(marker);
    });
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
