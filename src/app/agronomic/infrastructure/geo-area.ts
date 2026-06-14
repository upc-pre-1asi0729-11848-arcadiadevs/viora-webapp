/**
 * @file geo-area.ts
 * @description Client-side geodesic area estimate for a plot boundary polygon.
 * Used only to preview the productive area while drawing; the backend computes
 * the authoritative `areaSizeHectares` on registration.
 */
import { PlotCoordinate } from '../domain/model/plot.entity';

const EARTH_RADIUS_METERS = 6378137;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Spherical-excess approximation of a polygon ring area, in square meters.
 * Coordinates are `[longitude, latitude]` and may be open (first != last).
 */
export function polygonAreaSquareMeters(coordinates: PlotCoordinate[]): number {
  const ring = closeRing(coordinates);

  if (ring.length < 4) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude1, latitude1] = ring[index];
    const [longitude2, latitude2] = ring[index + 1];

    total +=
      toRadians(longitude2 - longitude1) *
      (2 + Math.sin(toRadians(latitude1)) + Math.sin(toRadians(latitude2)));
  }

  return Math.abs((total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
}

/** Polygon area in hectares (1 ha = 10,000 m²). */
export function polygonAreaHectares(coordinates: PlotCoordinate[]): number {
  return polygonAreaSquareMeters(coordinates) / 10000;
}

/** Ensures the ring is closed by repeating the first coordinate at the end. */
function closeRing(coordinates: PlotCoordinate[]): PlotCoordinate[] {
  if (coordinates.length < 3) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates;
  }

  return [...coordinates, first];
}
