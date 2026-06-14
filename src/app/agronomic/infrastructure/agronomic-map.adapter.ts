import { MapboxBaseAdapter } from '../../shared/infrastructure/mapbox-base.adapter';
import { Plot } from '../domain/model/plot.entity';

export interface PlotSurveillanceRenderOptions {
  /** Overlay the NDVI raster tiles on top of the satellite base. */
  imagery?: boolean;
}

export class AgronomicMapAdapter extends MapboxBaseAdapter {
  renderPlotSurveillance(
    plot: Plot | null | undefined,
    options: PlotSurveillanceRenderOptions = {}
  ): void {
    if (!plot?.hasValidPolygon) {
      return;
    }

    this.fitToCoordinates(plot.polygonCoordinates);

    if (options.imagery && plot.currentImagery?.tileUrl) {
      this.addRasterLayer(
        'ndvi-imagery',
        plot.currentImagery.tileUrl,
        plot.currentImagery.recommendedOpacity
      );
    }

    this.addPolygon(
      'plot-boundary',
      plot.polygonCoordinates,
      '#FFFFFF'
    );
  }
}
