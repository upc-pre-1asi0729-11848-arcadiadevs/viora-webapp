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

/**
 * Base for Platform API gateways. The auth interceptor attaches the JWT to
 * Platform calls; current-user resources are addressed by the signed-in user's
 * id in the PATH (e.g. `/profiles/{userId}`), sourced from the active session.
 * Backend JWT-derived identity (Phase B) is still deferred, so the id must
 * travel in the URL — not as a query param, which the backend ignores.
 */
export abstract class BaseApi {
  protected readonly http = inject(HttpClient);
  private readonly activeSession = inject(ActiveSessionService);
  protected readonly baseUrl = environment.vioraPlatformApiUrl;

  /**
   * The signed-in user's id for current-user resource paths. These gateways run
   * only on authenticated screens; `''` keeps the type total for a stray
   * unauthenticated call (guards prevent it from firing in practice).
   */
  protected get currentUserId(): number | string {
    return this.activeSession.userId ?? '';
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
