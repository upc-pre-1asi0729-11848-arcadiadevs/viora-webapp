import { SpecialistAvailability, SpecialistCandidate } from '../domain/model/specialist-candidate.entity';

/**
 * Backend resource shape for `GET /specialist-candidates`. The matching policy
 * is a stub today, so several presentation concepts (role, best-match flag,
 * granular availability) are not yet provided and are defaulted on mapping.
 */
export interface SpecialistCandidateResource {
  id: number | null;
  name: string | null;
  successRate: number | null;
  caseCount: number | null;
  distanceKm: number | null;
  experience: string | null;
  tags: string[] | null;
  available: boolean | null;
}

export class SpecialistCandidateAssembler {
  static toEntityFromResource(resource: SpecialistCandidateResource): SpecialistCandidate {
    const availability: SpecialistAvailability = resource.available ? 'today' : 'unavailable';

    return new SpecialistCandidate({
      id: resource.id ?? null,
      name: resource.name ?? '',
      role: 'Phytosanitary specialist',
      successRate: resource.successRate ?? 0,
      caseCount: resource.caseCount ?? 0,
      distanceKm: resource.distanceKm ?? 0,
      tags: resource.tags ?? [],
      availability,
      bestMatch: false,
    });
  }

  static toEntitiesFromResources(resources: SpecialistCandidateResource[]): SpecialistCandidate[] {
    return resources.map((resource) => SpecialistCandidateAssembler.toEntityFromResource(resource));
  }
}
