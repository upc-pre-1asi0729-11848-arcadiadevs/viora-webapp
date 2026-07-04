import { Injectable, inject } from '@angular/core';
import mapboxgl from 'mapbox-gl';
import type {
  LngLatLike,
  Map as MapboxMap,
  MapboxOptions
} from 'mapbox-gl';

import { environment } from '../../../environments/environment';
import { ActiveSessionService } from './active-session.service';

export interface CreateMapInstanceOptions
  extends Omit<MapboxOptions, 'style' | 'accessToken'> {
  container: HTMLElement;
  center?: LngLatLike;
  zoom?: number;
  style?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapboxService {
  private readonly defaultStyle = 'mapbox://styles/mapbox/satellite-v9';
  private readonly activeSession = inject(ActiveSessionService);

  constructor() {
    mapboxgl.accessToken = environment.mapbox.accessToken;
  }

  createMapInstance(options: CreateMapInstanceOptions): Promise<MapboxMap> {
    if (!environment.mapbox.accessToken) {
      return Promise.reject(
        new Error('[MapboxService] Mapbox access token is missing.')
      );
    }

    const map = new mapboxgl.Map({
      attributionControl: false,
      style: options.style ?? this.defaultStyle,
      zoom: options.zoom ?? 14,
      center: options.center ?? [0, 0],
      // Mapbox fetches raster tiles itself, outside Angular's HttpClient, so the
      // auth interceptor never sees them. Platform-served tiles (NDVI proxy)
      // need the bearer token attached here or the secured API returns 401.
      transformRequest: (url: string) => {
        const token = this.activeSession.token;
        if (token && url.startsWith(environment.vioraPlatformApiUrl)) {
          return {
            url,
            headers: { Authorization: `Bearer ${token}` }
          };
        }
        return { url };
      },
      ...options
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.keepCanvasFitted(map, options.container);

    return Promise.resolve(map);
  }

  /**
   * Keeps the Mapbox canvas matched to its container size. Mapbox does not detect
   * layout-driven width changes (e.g. collapsing the sidebar), which leaves an
   * unrendered strip; a ResizeObserver resizes the map whenever the container
   * dimensions change. The resize is deferred to the next frame to avoid
   * "ResizeObserver loop" warnings.
   */
  private keepCanvasFitted(map: MapboxMap, container: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => map.resize());
    });

    observer.observe(container);
    map.on('remove', () => observer.disconnect());
  }
}
