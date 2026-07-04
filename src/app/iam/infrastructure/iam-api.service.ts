import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { UserSession } from '../domain/model/user-session.entity';
import { ChangePasswordRequest, UserSessionAssembler, UserSessionResource } from './iam-response';

/**
 * Infrastructure gateway for IAM account-security operations (Settings ›
 * Security), served by the real Viora Platform backend: password change, active
 * sessions, and account deactivation for the active user.
 *
 * @class IamApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class IamApiService extends BaseApi {
  private readonly usersEndpoint = this.endpoint(environment.endpoints.users);

  private sessionsUrl(): string {
    return `${this.usersEndpoint.resourceUrl('me')}/sessions`;
  }

  /** Lists the active user's signed-in sessions. */
  getSessions(): Observable<UserSession[]> {
    return this.http
      .get<UserSessionResource[]>(this.sessionsUrl())
      .pipe(map((resources) => UserSessionAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /** Revokes (signs out) a session. Errors are surfaced to callers. */
  revokeSession(sessionId: number | string): Observable<unknown> {
    return this.http.delete(`${this.sessionsUrl()}/${sessionId}`);
  }

  /** Changes the active user's password. Errors are surfaced to callers. */
  changePassword(request: ChangePasswordRequest): Observable<unknown> {
    return this.http.put(`${this.usersEndpoint.resourceUrl('me')}/password`, request);
  }

  /** Permanently deletes the active user's account (Danger zone). */
  deleteAccount(): Observable<unknown> {
    return this.http.delete(this.usersEndpoint.resourceUrl('me'));
  }
}
