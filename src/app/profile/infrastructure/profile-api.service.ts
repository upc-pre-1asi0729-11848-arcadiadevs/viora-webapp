import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { UserProfile } from '../domain/model/user-profile.entity';
import { ProfileAssembler, ProfileResource, UpdateProfileRequest } from './profile-response';

/**
 * Infrastructure gateway for the Profile bounded context (Profile & Asset
 * Management), served by the real Viora Platform backend.
 *
 * @class ProfileApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class ProfileApiService extends BaseApi {
  private readonly profilesEndpoint = this.endpoint(environment.endpoints.profiles);

  /**
   * Fetches the active account holder's profile.
   * @returns {Observable<UserProfile>}
   */
  getProfile(): Observable<UserProfile> {
    return this.http
      .get<ProfileResource>(this.profilesEndpoint.resourceUrl(this.currentUserId))
      .pipe(map((resource) => ProfileAssembler.toEntityFromResource(resource)));
  }

  /**
   * Persists the editable profile fields (upsert on the backend).
   * @param {UpdateProfileRequest} changes - The edited fields.
   * @returns {Observable<UserProfile>}
   */
  updateProfile(changes: UpdateProfileRequest): Observable<UserProfile> {
    return this.http
      .put<ProfileResource>(this.profilesEndpoint.resourceUrl(this.currentUserId), changes)
      .pipe(map((resource) => ProfileAssembler.toEntityFromResource(resource)));
  }
}
