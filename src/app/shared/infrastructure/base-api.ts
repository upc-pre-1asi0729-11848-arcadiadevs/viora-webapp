import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';

import { ActiveSessionService } from './active-session.service';
import { BaseApiEndpoint } from './base-api-endpoint';
import {
  CollectionResponse,
  extractResourceCollection
} from './base-response';

export type ApiQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export abstract class BaseApi {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.vioraPlatformApiUrl;
  private readonly activeSession = inject(ActiveSessionService);

  /**
   * Active user identifier sent to the real backend, which requires `userId`
   * on every request. Sourced solely from the authenticated session — there is
   * no fallback, so an unauthenticated call fails loudly instead of silently
   * masquerading as another account. Route guards keep authenticated screens
   * behind a session, so this is only reached with a real user.
   */
  protected get defaultUserId(): number {
    const userId = this.activeSession.userId;
    if (userId === null) {
      throw new Error('No authenticated session: a Platform API call requires a signed-in user.');
    }
    return userId;
  }

  protected endpoint(path: string): BaseApiEndpoint {
    return new BaseApiEndpoint(this.baseUrl, path);
  }

  protected queryParams(params: ApiQueryParams = {}): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  protected collectionFrom<TResource, TKey extends string>(
    response: CollectionResponse<TResource, TKey>,
    key: TKey
  ): TResource[] {
    return extractResourceCollection(response, key);
  }
}
