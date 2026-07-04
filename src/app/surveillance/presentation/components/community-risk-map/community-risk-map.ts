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
import { NearbyRiskSignal } from '../../../domain/model/nearby-risk-signal.entity';

/** [longitude, latitude] tuple. */
export type LngLat = [number, number];

const RINGS_SOURCE = 'community-risk-rings';
const RINGS_LAYER = 'community-risk-rings-layer';

/**
 * Satellite map for the Community Risk section. Centers on the producer's own
 * plot centroid and draws the monitoring radius as concentric rings. Nearby
 * signals only carry an (anonymized) distance, so each is placed on its correct
 * distance ring at a deterministic bearing — never at a real neighbor location.
 */
@Component({
  selector: 'app-community-risk-map',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './community-risk-map.html',
  styleUrl: './community-risk-map.css',
})
export class CommunityRiskMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer')
  private readonly mapContainer?: ElementRef<HTMLElement>;

  /** Centroid of the reference plot, as [lng, lat]. */
  readonly center = input<LngLat | null>(null);
  /** Monitoring radius in kilometers. */
  readonly radiusKm = input<number>(5);
  /** Anonymized nearby signals to plot on their distance ring. */
  readonly signals = input<NearbyRiskSignal[]>([]);

  protected readonly mapUnavailable = signal<boolean>(false);

  private readonly viewReady = signal<boolean>(false);
  private map: MapboxMap | null = null;
  private centerMarker: Marker | null = null;
  private signalMarkers: Marker[] = [];
  private observer?: ResizeObserver;

  constructor() {
    // The reference plot (and thus the centroid) arrives asynchronously, so the
    // map is created lazily once both the view and a center are available, and
    // re-rendered whenever the plot, radius or signals change.
    effect(() => {
      const center = this.center();
      const radiusKm = this.radiusKm();
      const signals = this.signals();

      if (!this.viewReady() || !center) {
        return;
      }

      if (!this.map) {
        this.initMap(center);
        return;
      }

      if (this.map.isStyleLoaded()) {
        this.render(center, radiusKm, signals);
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

  private initMap(center: LngLat): void {
    const container = this.mapContainer?.nativeElement;

    if (!container) {
      return;
    }

    mapboxgl.accessToken = environment.mapbox.accessToken;

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center,
      zoom: 11,
      interactive: true,
      attributionControl: false,
    });

    this.map = map;
    map.on('error', () => this.mapUnavailable.set(true));
    map.on('load', () => this.render(center, this.radiusKm(), this.signals()));

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
    this.centerMarker?.remove();
    this.map?.remove();
    this.map = null;
  }

  /** Draws the rings, center marker and signal markers, then frames the radius. */
  private render(center: LngLat, radiusKm: number, signals: NearbyRiskSignal[]): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.drawRings(map, center, radiusKm);

    this.centerMarker?.remove();
    this.centerMarker = new mapboxgl.Marker({ color: '#2e4a3a' })
      .setLngLat(center)
      .addTo(map);

    this.clearSignalMarkers();
    // Keep very-close signals (adjacent plots, distance ~0) from rendering under
    // the center marker: enforce a minimum *visual* offset. The popup still
    // reports the real distance.
    const minVisualKm = radiusKm * 0.08;
    signals.forEach((signal, index) => {
      const bearing = (index / Math.max(signals.length, 1)) * 360;
      const visualDistanceKm = Math.max(signal.distanceKm, minVisualKm);
      const position = this.destination(center, visualDistanceKm, bearing);
      const marker = new mapboxgl.Marker({ color: this.severityColor(signal.severity) })
        .setLngLat(position)
        .setPopup(
          new mapboxgl.Popup({ offset: 18, closeButton: false }).setText(
            `${signal.title} · ${signal.distanceKm} km`,
          ),
        )
        .addTo(map);
      this.signalMarkers.push(marker);
    });

    const ring = this.circlePolygon(center, radiusKm);
    const bounds = ring.reduce(
      (acc, point) => acc.extend(point),
      new mapboxgl.LngLatBounds(ring[0], ring[0]),
    );
    map.fitBounds(bounds, { padding: 40, duration: 600 });
  }

  private drawRings(map: MapboxMap, center: LngLat, radiusKm: number): void {
    if (map.getLayer(RINGS_LAYER)) {
      map.removeLayer(RINGS_LAYER);
    }
    if (map.getSource(RINGS_SOURCE)) {
      map.removeSource(RINGS_SOURCE);
    }

    const fractions = [1, 0.66, 0.33];
    const features = fractions.map((fraction) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: this.circlePolygon(center, radiusKm * fraction),
      },
    }));

    map.addSource(RINGS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
    });

    map.addLayer({
      id: RINGS_LAYER,
      type: 'line',
      source: RINGS_SOURCE,
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.5,
        'line-opacity': 0.7,
        'line-dasharray': [2, 2],
      },
    });
  }

  /** Builds an approximate geodesic circle as a closed ring of points. */
  private circlePolygon(center: LngLat, radiusKm: number, points = 64): LngLat[] {
    const coordinates: LngLat[] = [];

    for (let index = 0; index <= points; index++) {
      const bearing = (index / points) * 360;
      coordinates.push(this.destination(center, radiusKm, bearing));
    }

    return coordinates;
  }

  /** Destination point from a center given a distance (km) and bearing (deg). */
  private destination(center: LngLat, distanceKm: number, bearingDeg: number): LngLat {
    const latitudeRadians = (center[1] * Math.PI) / 180;
    const deltaLongitude = distanceKm / (111.32 * Math.cos(latitudeRadians));
    const deltaLatitude = distanceKm / 110.574;
    const bearing = (bearingDeg * Math.PI) / 180;

    return [
      center[0] + deltaLongitude * Math.sin(bearing),
      center[1] + deltaLatitude * Math.cos(bearing),
    ];
  }

  private severityColor(severity: NearbyRiskSignal['severity']): string {
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
