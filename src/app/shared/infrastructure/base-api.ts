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

/**
 * Base for Platform API gateways. Identity is no longer sent by the client: the
 * backend derives the user from the JWT (the auth interceptor attaches it), so
 * requests carry no userId. Current-user resources are addressed as `/me`.
 */
export abstract class BaseApi {
  protected readonly http = inject(HttpClient);
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

  protected collectionFrom<TResource, TKey extends string>(
    response: CollectionResponse<TResource, TKey>,
    key: TKey
  ): TResource[] {
    return extractResourceCollection(response, key);
  }
}
