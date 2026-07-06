/**
 * @file specialist-candidate.entity.ts
 * @description Domain entity for a phytosanitary specialist recommended for an alert.
 */
export type SpecialistAvailability = 'today' | 'tomorrow' | 'week' | 'unavailable';

export interface SpecialistCandidateProps {
  id?: number | string | null;
  name?: string;
  /** Producer-facing role, e.g. "Phytosanitary specialist" (no honorific prefix). */
  role?: string;
  /** Success rate as a percentage (0–100); null when there are no closed cases yet. */
  successRate?: number | null;
  caseCount?: number;
  /** Distance to the case (km); null on a standalone lookup with no alert context. */
  distanceKm?: number | null;
  tags?: string[];
  availability?: SpecialistAvailability;
  /** Avatar URL; empty falls back to the initials monogram. */
  photoUrl?: string;
  /** Highlights the single best-ranked candidate for the alert. */
  bestMatch?: boolean;
}

const AVAILABILITY_LABELS: Record<SpecialistAvailability, string> = {
  today: 'Available today',
  tomorrow: 'Available tomorrow',
  week: 'Available this week',
  unavailable: 'Unavailable',
};

export class SpecialistCandidate {
  readonly id: number | string | null;
  readonly name: string;
  readonly role: string;
  /** Service success rate (%); null when the specialist has no closed cases yet. */
  readonly successRate: number | null;
  readonly caseCount: number;
  /** Distance to the case (km); null on a standalone lookup with no alert context. */
  readonly distanceKm: number | null;
  readonly tags: string[];
  readonly availability: SpecialistAvailability;
  readonly photoUrl: string;
  readonly bestMatch: boolean;

  constructor({
    id = null,
    name = '',
    role = '',
    successRate = null,
    caseCount = 0,
    distanceKm = null,
    tags = [],
    availability = 'week',
    photoUrl = '',
    bestMatch = false,
  }: SpecialistCandidateProps = {}) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.successRate = successRate;
    this.caseCount = caseCount;
    this.distanceKm = distanceKm;
    this.tags = tags;
    this.availability = availability;
    this.photoUrl = photoUrl;
    this.bestMatch = bestMatch;
  }

  /** Two-letter monogram used by the avatar bubble. */
  get initials(): string {
    const parts = this.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '—';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return `${first}${last}`.toUpperCase();
  }

  get availabilityLabel(): string {
    return AVAILABILITY_LABELS[this.availability];
  }

  get isAvailable(): boolean {
    return this.availability !== 'unavailable';
  }

  get successRateLabel(): string {
    return this.successRate == null ? 'No ratings yet' : `${Math.round(this.successRate)}% success`;
  }

  /** Bare percentage for stat rows ("100%"), or an em dash when unrated. */
  get successRatePercentLabel(): string {
    return this.successRate == null ? '—' : `${Math.round(this.successRate)}%`;
  }

  get caseCountLabel(): string {
    return `${this.caseCount} cases`;
  }

  get distanceLabel(): string {
    return this.distanceKm == null ? '—' : `${this.distanceKm.toFixed(1)} km away`;
  }
}
