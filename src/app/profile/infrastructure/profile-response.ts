import { ProfileRole, UserProfile } from '../domain/model/user-profile.entity';

/** Backend resource shape for `GET/PUT /profiles/{userId}`. */
export interface ProfileResource {
  id: number | null;
  userId: number | null;
  role: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  language: string | null;
  location: string | null;
  specialtyArea: string | null;
  photoUrl: string | null;
}

/** Request body for `PUT /profiles/me`; the owning user id travels as a query param. */
export interface UpdateProfileRequest {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  language: string;
  location: string;
  specialtyArea: string;
  photoUrl: string;
}

/** Producer-facing caption for the backend role enum. */
const ROLE_LABELS: Record<ProfileRole, string> = {
  producer: 'Olive producer',
  specialist: 'Phytosanitary specialist',
};

function toRole(raw: string | null): ProfileRole {
  return raw?.toUpperCase() === 'SPECIALIST' ? 'specialist' : 'producer';
}

export class ProfileAssembler {
  static toEntityFromResource(resource: ProfileResource): UserProfile {
    const role = toRole(resource.role);
    return new UserProfile({
      id: resource.id ?? null,
      role,
      fullName: resource.fullName ?? '',
      email: resource.email ?? '',
      phone: resource.phone ?? '',
      jobTitle: resource.jobTitle ?? '',
      roleLabel: ROLE_LABELS[role],
      language: resource.language ?? 'English',
      location: resource.location ?? '',
      specialtyArea: resource.specialtyArea ?? '',
      photoUrl: resource.photoUrl ?? '',
    });
  }
}
