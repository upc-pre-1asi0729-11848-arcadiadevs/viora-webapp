import { SpecialistAvailability, SpecialistCandidate } from '../domain/model/specialist-candidate.entity';

/**
 * Backend resource shape for `GET /specialist-candidates`. The matching policy
 * now ranks a real seeded specialist catalog, so it carries the producer-facing
 * `role` and a granular `availability` enum (plus a convenience `available` flag).
 */
export interface SpecialistCandidateResource {
  id: number | null;
  name: string | null;
  role: string | null;
  successRate: number | null;
  caseCount: number | null;
  distanceKm: number | null;
  tags: string[] | null;
  availability: string | null;
  available: boolean | null;
}

/** Maps the backend availability enum to the local presentation availability. */
function toAvailability(resource: SpecialistCandidateResource): SpecialistAvailability {
  switch ((resource.availability ?? '').toUpperCase()) {
    case 'AVAILABLE_TODAY':
      return 'today';
    case 'AVAILABLE_TOMORROW':
      return 'tomorrow';
    case 'AVAILABLE_THIS_WEEK':
      return 'week';
    case 'UNAVAILABLE':
      return 'unavailable';
    default:
      return resource.available ? 'today' : 'unavailable';
  }
}

export class SpecialistCandidateAssembler {
  static toEntityFromResource(
    resource: SpecialistCandidateResource,
    bestMatch = false,
  ): SpecialistCandidate {
    return new SpecialistCandidate({
      id: resource.id ?? null,
      name: resource.name ?? '',
      role: resource.role ?? 'Phytosanitary specialist',
      successRate: resource.successRate ?? 0,
      caseCount: resource.caseCount ?? 0,
      distanceKm: resource.distanceKm ?? 0,
      tags: resource.tags ?? [],
      availability: toAvailability(resource),
      bestMatch,
    });
  }

  static toEntitiesFromResources(resources: SpecialistCandidateResource[]): SpecialistCandidate[] {
    // The backend returns candidates already ranked (availability, then success
    // rate, then distance), so the first entry is the best match.
    return resources.map((resource, index) =>
      SpecialistCandidateAssembler.toEntityFromResource(resource, index === 0),
    );
  }
}
