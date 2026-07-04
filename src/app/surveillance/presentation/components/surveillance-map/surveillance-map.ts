import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { TranslatePipe } from '@ngx-translate/core';

import { environment } from '../../../../../environments/environment';
import { AlertSeverity } from '../../../domain/model/alert.entity';
import { RiskZone } from '../../../domain/model/pest-report.entity';

/** [longitude, latitude] tuple. */
export type LngLat = [number, number];

/** A risk signal to plot on the plot map, positioned by its coarse risk zone. */
export interface SurveillanceMapMarker {
  id: string;
  title: string;
  severity: AlertSeverity;
  riskZone: RiskZone;
}

const BOUNDARY_SOURCE = 'surveillance-plot-boundary';

/**
 * Read-only satellite map of a single plot: draws the plot boundary and places
 * risk-signal markers by their coarse risk zone (FULL_PLOT → centroid, EDGES →
 * boundary, PARTIAL_PLOT → between). The backend does not store per-signal
 * coordinates, so positions are intentionally approximate.
 */
@Component({
  selector: 'app-surveillance-map',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './surveillance-map.html',
  styleUrl: './surveillance-map.css',
})
export class SurveillanceMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  private readonly mapContainer?: ElementRef<HTMLElement>;

  /** Plot boundary as [lng, lat] points (open or closed ring). */
  readonly boundary = input<LngLat[]>([]);
  /** Risk-signal markers to place on the plot. */
  readonly markers = input<SurveillanceMapMarker[]>([]);

  protected readonly mapUnavailable = signal<boolean>(false);

  private readonly viewReady = signal<boolean>(false);
  private map: MapboxMap | null = null;
  private signalMarkers: Marker[] = [];
  private observer?: ResizeObserver;

  constructor() {
    effect(() => {
      const boundary = this.boundary();
      const markers = this.markers();

      if (!this.viewReady() || boundary.length < 3) {
        return;
      }

      if (!this.map) {
        this.initMap(boundary);
        return;
      }

      if (this.map.isStyleLoaded()) {
        this.render(boundary, markers);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!environment.mapbox.accessToken) {
      this.mapUnavailable.set(true);
      return;
    }

    this.viewReady.set(true);
  }

  private initMap(boundary: LngLat[]): void {
    const container = this.mapContainer?.nativeElement;

    if (!container) {
      return;
    }

    mapboxgl.accessToken = environment.mapbox.accessToken;

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: this.centroid(boundary),
      zoom: 14,
      interactive: true,
      attributionControl: false,
    });

    this.map = map;
    map.on('error', () => this.mapUnavailable.set(true));
    map.on('load', () => this.render(boundary, this.markers()));

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
    this.clearSignalMarkers();
    this.map?.remove();
    this.map = null;
  }

  private render(boundary: LngLat[], markers: SurveillanceMapMarker[]): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.drawBoundary(map, boundary);

    const centroid = this.centroid(boundary);
    this.clearSignalMarkers();

    markers.forEach((marker, index) => {
      const position = this.positionFor(marker.riskZone, boundary, centroid, index);
      const element = this.markerElement(marker.severity);
      const mapMarker = new mapboxgl.Marker({ element })
        .setLngLat(position)
        .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(marker.title))
        .addTo(map);
      this.signalMarkers.push(mapMarker);
    });

    const ring = this.closedRing(boundary);
    const bounds = ring.reduce(
      (acc, point) => acc.extend(point),
      new mapboxgl.LngLatBounds(ring[0], ring[0]),
    );
    map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 16 });
  }

  private drawBoundary(map: MapboxMap, boundary: LngLat[]): void {
    const ring = this.closedRing(boundary);

    const data: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [ring] },
    };

    const source = map.getSource(BOUNDARY_SOURCE) as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
      return;
    }

    map.addSource(BOUNDARY_SOURCE, { type: 'geojson', data });
    map.addLayer({
      id: `${BOUNDARY_SOURCE}-fill`,
      type: 'fill',
      source: BOUNDARY_SOURCE,
      paint: { 'fill-color': '#2e4a3a', 'fill-opacity': 0.18 },
    });
    map.addLayer({
      id: `${BOUNDARY_SOURCE}-line`,
      type: 'line',
      source: BOUNDARY_SOURCE,
      paint: { 'line-color': '#2e4a3a', 'line-width': 2.5 },
    });
  }

  /** Approximate marker position from the coarse risk zone. */
  private positionFor(
    riskZone: RiskZone,
    boundary: LngLat[],
    centroid: LngLat,
    index: number,
  ): LngLat {
    if (riskZone === 'EDGES') {
      return boundary[index % boundary.length];
    }

    if (riskZone === 'PARTIAL_PLOT') {
      const vertex = boundary[index % boundary.length];
      return [(centroid[0] + vertex[0]) / 2, (centroid[1] + vertex[1]) / 2];
    }

    // FULL_PLOT → centroid, with a tiny spread so co-located markers don't stack.
    const spread = 0.0006 * index;
    const angle = (index / Math.max(1, index)) * Math.PI * 0.5;
    return [centroid[0] + spread * Math.cos(angle), centroid[1] + spread * Math.sin(angle)];
  }

  private centroid(boundary: LngLat[]): LngLat {
    const ring = this.openRing(boundary);
    const sum = ring.reduce(
      (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat] as LngLat,
      [0, 0] as LngLat,
    );
    return [sum[0] / ring.length, sum[1] / ring.length];
  }

  /** Drops the repeated closing vertex if present. */
  private openRing(boundary: LngLat[]): LngLat[] {
    if (boundary.length >= 2) {
      const first = boundary[0];
      const last = boundary[boundary.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        return boundary.slice(0, -1);
      }
    }
    return boundary;
  }

  /** Ensures the ring is closed for polygon rendering. */
  private closedRing(boundary: LngLat[]): LngLat[] {
    const open = this.openRing(boundary);
    return [...open, open[0]];
  }

  private markerElement(severity: AlertSeverity): HTMLElement {
    const element = document.createElement('div');
    element.style.width = '16px';
    element.style.height = '16px';
    element.style.borderRadius = '50%';
    element.style.border = '2px solid #ffffff';
    element.style.boxShadow = '0 0 0 4px rgba(255, 255, 255, 0.25)';
    element.style.background = this.severityColor(severity);
    element.style.cursor = 'pointer';
    return element;
  }

  private severityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'Critical':
      case 'High':
        return '#e53535';
      case 'Medium':
        return '#f0883e';
      default:
        return '#57eba1';
    }
  }

  private clearSignalMarkers(): void {
    this.signalMarkers.forEach((marker) => marker.remove());
    this.signalMarkers = [];
  }
}
