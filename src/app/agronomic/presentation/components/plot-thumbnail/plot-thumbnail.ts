import { Component, Input, computed, signal } from '@angular/core';

import { PlotCoordinate } from '../../../domain/model/plot.entity';

/**
 * Lightweight SVG thumbnail that renders a plot's boundary polygon, matching the
 * stylized green preview used on the My Plots cards. Avoids spinning up a full
 * Mapbox instance per card; falls back to a default shape when no coordinates
 * are available.
 */
@Component({
  selector: 'app-plot-thumbnail',
  standalone: true,
  imports: [],
  templateUrl: './plot-thumbnail.html',
  styleUrl: './plot-thumbnail.css',
})
export class PlotThumbnail {
  private static readonly VIEWBOX = 100;
  private static readonly PADDING = 20;
  private static readonly DEFAULT_POINTS = '34,22 70,30 78,64 50,82 24,58';

  private readonly coordinates = signal<PlotCoordinate[]>([]);

  @Input() set polygonCoordinates(value: PlotCoordinate[] | null | undefined) {
    this.coordinates.set(value ?? []);
  }

  /** Polygon point list ("x,y x,y ...") normalized into the SVG viewBox. */
  protected readonly points = computed<string>(() => {
    const coordinates = this.coordinates();

    if (coordinates.length < 3) {
      return PlotThumbnail.DEFAULT_POINTS;
    }

    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);

    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);

    const longitudeSpan = maxLongitude - minLongitude || 1;
    const latitudeSpan = maxLatitude - minLatitude || 1;

    const usableSize = PlotThumbnail.VIEWBOX - PlotThumbnail.PADDING * 2;

    return coordinates
      .map(([longitude, latitude]) => {
        const x =
          PlotThumbnail.PADDING +
          ((longitude - minLongitude) / longitudeSpan) * usableSize;
        // Flip the latitude axis because SVG y grows downward.
        const y =
          PlotThumbnail.PADDING +
          ((maxLatitude - latitude) / latitudeSpan) * usableSize;

        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
}
