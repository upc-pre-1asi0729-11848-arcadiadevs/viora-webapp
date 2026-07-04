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
 * Platform calls; endpoints that still require an explicit current-user id can
 * source it from the active session without changing feature-store logic.
 */
export abstract class BaseApi {
  protected readonly http = inject(HttpClient);
  private readonly activeSession = inject(ActiveSessionService);
  protected readonly baseUrl = environment.vioraPlatformApiUrl;

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

  protected currentUserParams(params: ApiQueryParams = {}): HttpParams {
    return this.queryParams({
      userId: this.activeSession.userId,
      ...params,
    });
  }

  protected collectionFrom<TResource, TKey extends string>(
    response: CollectionResponse<TResource, TKey>,
    key: TKey
  ): TResource[] {
    return extractResourceCollection(response, key);
  }
}
