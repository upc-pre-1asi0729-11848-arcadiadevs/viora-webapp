import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';

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

  /**
   * Active user identifier sent to the real backend, which requires `userId`
   * on every request. Sourced from configuration until authentication exists.
   */
  protected readonly defaultUserId = environment.defaultUserId;

  protected endpoint(path: string): BaseApiEndpoint {
    return new BaseApiEndpoint(this.baseUrl, path);
  }

  /**
   * Merges the active `userId` into a set of query params, letting callers
   * override it when needed.
   */
  protected withUserId(params: ApiQueryParams = {}): ApiQueryParams {
    return { userId: this.defaultUserId, ...params };
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
