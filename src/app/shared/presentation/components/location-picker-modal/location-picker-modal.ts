import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';

import { environment } from '../../../../../environments/environment';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

interface GeocodingResponse {
  features?: Array<{ center?: [number, number]; place_name?: string }>;
}

/**
 * Modal that lets a specialist set their base location on a Mapbox map instead of
 * typing raw coordinates. They search or click a point; on confirm we reverse-geocode
 * it to a readable place name and emit both the coordinates (for the backend distance
 * ranking) and the label (for the "Service area" field).
 */
@Component({
  selector: 'app-location-picker-modal',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './location-picker-modal.html',
  styleUrl: './location-picker-modal.css',
})
export class LocationPickerModal implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);

  /** Optional starting point; defaults to a wide view of Peru when unset. */
  @Input() initialLat: number | null = null;
  @Input() initialLng: number | null = null;

  @Output() readonly confirmed = new EventEmitter<PickedLocation>();
  @Output() readonly dismissed = new EventEmitter<void>();

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly mapUnavailable = signal<boolean>(false);
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedLabel = signal<string>('');
  protected readonly resolving = signal<boolean>(false);

  private map: MapboxMap | null = null;
  private marker: Marker | null = null;
  private lat = 0;
  private lng = 0;
  private readonly defaultCenter: [number, number] = [-75.0152, -9.19]; // Peru

  ngAfterViewInit(): void {
    if (!environment.mapbox.accessToken) {
      this.mapUnavailable.set(true);
      return;
    }
    const container = this.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    const hasInitial = this.initialLat != null && this.initialLng != null;
    const center: [number, number] = hasInitial
      ? [this.initialLng as number, this.initialLat as number]
      : this.defaultCenter;
    this.lng = center[0];
    this.lat = center[1];

    mapboxgl.accessToken = environment.mapbox.accessToken;
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center,
      zoom: hasInitial ? 11 : 4,
      attributionControl: false,
    });
    this.map = map;
    map.on('error', () => this.mapUnavailable.set(true));

    this.marker = new mapboxgl.Marker({ color: '#2e4a3a', draggable: true })
      .setLngLat(center)
      .addTo(map);
    this.marker.on('dragend', () => {
      const pos = this.marker?.getLngLat();
      if (pos) {
        this.setPoint(pos.lat, pos.lng);
      }
    });
    map.on('click', (event) => this.setPoint(event.lngLat.lat, event.lngLat.lng, true));

    if (hasInitial) {
      this.reverseGeocode();
    }
    [200, 600].forEach((delay) => setTimeout(() => map.resize(), delay));
  }

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
    this.map = null;
  }

  protected onSearch(): void {
    const term = this.searchTerm().trim();
    if (!term || !environment.mapbox.accessToken) {
      return;
    }
    this.resolving.set(true);
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(term)}.json` +
      `?limit=1&access_token=${environment.mapbox.accessToken}`;
    this.http.get<GeocodingResponse>(url).subscribe({
      next: (res) => {
        const feature = res.features?.[0];
        if (feature?.center) {
          const [lng, lat] = feature.center;
          this.map?.flyTo({ center: [lng, lat], zoom: 11 });
          this.setPoint(lat, lng);
          this.selectedLabel.set(feature.place_name ?? '');
        }
        this.resolving.set(false);
      },
      error: () => this.resolving.set(false),
    });
  }

  protected confirm(): void {
    this.confirmed.emit({
      latitude: Number(this.lat.toFixed(6)),
      longitude: Number(this.lng.toFixed(6)),
      label: this.selectedLabel().trim(),
    });
  }

  protected dismiss(): void {
    this.dismissed.emit();
  }

  /** Moves the marker; when the point comes from a click, refresh the place label. */
  private setPoint(lat: number, lng: number, resolveLabel = false): void {
    this.lat = lat;
    this.lng = lng;
    this.marker?.setLngLat([lng, lat]);
    if (resolveLabel) {
      this.reverseGeocode();
    }
  }

  private reverseGeocode(): void {
    if (!environment.mapbox.accessToken) {
      return;
    }
    this.resolving.set(true);
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${this.lng},${this.lat}.json` +
      `?limit=1&access_token=${environment.mapbox.accessToken}`;
    this.http.get<GeocodingResponse>(url).subscribe({
      next: (res) => {
        this.selectedLabel.set(res.features?.[0]?.place_name ?? '');
        this.resolving.set(false);
      },
      error: () => this.resolving.set(false),
    });
  }
}
