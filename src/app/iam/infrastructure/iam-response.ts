import { UserSession } from '../domain/model/user-session.entity';

/** Backend resource shape for `GET /users/{userId}/sessions` items. */
export interface UserSessionResource {
  id: number | null;
  device: string | null;
  client: string | null;
  location: string | null;
  lastActiveAt: string | null;
  current: boolean | null;
}

/** Request body for `PUT /users/{userId}/password`. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class UserSessionAssembler {
  static toEntityFromResource(resource: UserSessionResource): UserSession {
    return new UserSession({
      id: resource.id ?? null,
      device: resource.device ?? '',
      client: resource.client ?? '',
      location: resource.location ?? '',
      lastActiveAt: resource.lastActiveAt ?? null,
      current: resource.current ?? false,
    });
  }

  static toEntitiesFromResources(resources: UserSessionResource[]): UserSession[] {
    return resources.map((resource) => UserSessionAssembler.toEntityFromResource(resource));
  }
}
