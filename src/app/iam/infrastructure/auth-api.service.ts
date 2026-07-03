import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import {
  AuthenticatedUserResource,
  RegisteredUserResource,
  SignInRequest,
  SignUpRequest,
} from './auth-response';

/**
 * Infrastructure gateway for IAM authentication, served by the real Viora
 * Platform backend: email sign-in/sign-up, email verification and verification
 * resend.
 *
 * @class AuthApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService extends BaseApi {
  private readonly authEndpoint = this.endpoint(environment.endpoints.auth);

  /** Authenticates by email; returns the identity + JWT. */
  signIn(request: SignInRequest): Observable<AuthenticatedUserResource> {
    return this.http.post<AuthenticatedUserResource>(
      `${this.authEndpoint.collectionUrl}/sign-in`,
      request,
    );
  }

  /** Registers a new unverified account; the backend emails the token. */
  signUp(request: SignUpRequest): Observable<RegisteredUserResource> {
    return this.http.post<RegisteredUserResource>(
      `${this.authEndpoint.collectionUrl}/sign-up`,
      request,
    );
  }

  /** Consumes the emailed verification token; returns the identity + JWT. */
  verify(token: string): Observable<AuthenticatedUserResource> {
    return this.http.post<AuthenticatedUserResource>(
      `${this.authEndpoint.collectionUrl}/verify`,
      { token },
    );
  }

  /** Re-sends the verification email for an unverified account. */
  resendVerification(email: string): Observable<RegisteredUserResource> {
    return this.http.post<RegisteredUserResource>(
      `${this.authEndpoint.collectionUrl}/resend-verification`,
      { email },
    );
  }
}
